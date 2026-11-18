// imgix emulation (images.prismic.io is imgix): GET /api/img?src=<local public url | original url>&rect=x,y,w,h
//   &w=&h=&fit=crop|max|clip|min|scale|fill&q=&auto=format[&fm=webp|avif|jpg|png]
// Reads ONLY files under /public (public/remote/<host>/… or site-root files). Results are cached on disk in
// .cache/img/<sha1>.<ext> and served with a 1-year immutable Cache-Control.
// Semantics (imgix docs): rect crops the source first; fit=clip (default) fits inside w×h keeping the aspect
// ratio (may upscale); max = clip without upscaling; crop = cover + centre crop; min = cover without upscaling;
// scale = exact w×h (distort); fill = clip with the derived side rounded up, or exact w×h padded with
// fill-color (default white) when fill=solid. q default 75. auto=format → AVIF if the Accept header allows
// it, else WebP, else the source format (JPEG when the source is AVIF/WebP). Audit 2026-11-06: output sizes
// checked against images.prismic.io for 24+ parameter sets (scripts/foundation/img-imgix-compare.mjs).
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { publicFilePath } from '@/lib/media.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'img');
const MAX_DIM = 8192;
const PASSTHROUGH = /\.(svg|gif)$/i;
const MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};
const LONG_CACHE = 'public, max-age=31536000, immutable';

function intParam(v: string | null, max = MAX_DIM): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(n, max);
}

/** imgix `fill-color`: 3/4/6/8-digit hex (ARGB for 4/8 digits, as imgix) or a few CSS names. */
function parseColor(v: string | null): { r: number; g: number; b: number; alpha: number } | null {
  if (!v) return null;
  const named: Record<string, string> = { white: 'fff', black: '000', transparent: '0000' };
  let hex = (named[v.toLowerCase()] ?? v).replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  if (hex.length === 3 || hex.length === 4) hex = hex.replace(/./g, (c) => c + c);
  if (hex.length === 6) hex = 'ff' + hex;
  if (hex.length !== 8) return null;
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return { alpha: n(0) / 255, r: n(2), g: n(4), b: n(6) };
}

function bad(status: number, msg: string) {
  return new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const src = sp.get('src') || sp.get('url');
  if (!src) return bad(400, 'missing src');
  const file = publicFilePath(src);
  if (!file) return bad(403, 'src must resolve inside /public');
  const pub = path.join(process.cwd(), 'public');
  const rel = path.relative(pub, file);
  if (rel.startsWith('..')) return bad(403, 'forbidden');

  let stat;
  try {
    stat = await fs.stat(file);
    if (!stat.isFile()) return bad(404, 'not found');
  } catch {
    return bad(404, 'not found');
  }

  const ext = path.extname(file).slice(1).toLowerCase();
  if (PASSTHROUGH.test(file)) {
    const body = await fs.readFile(file);
    return new Response(new Uint8Array(body), { headers: { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': LONG_CACHE } });
  }

  // ---- params
  let rect: { left: number; top: number; width: number; height: number } | undefined;
  const rectRaw = sp.get('rect');
  if (rectRaw) {
    const r = rectRaw.split(',').map((n) => Math.round(Number(n)));
    if (r.length !== 4 || r.some((n) => !Number.isFinite(n) || n < 0)) return bad(400, 'bad rect');
    rect = { left: r[0], top: r[1], width: r[2], height: r[3] };
  }
  const w = intParam(sp.get('w'));
  const h = intParam(sp.get('h'));
  const fit = (sp.get('fit') || 'clip').toLowerCase();
  const q = intParam(sp.get('q'), 100) ?? 75;
  const auto = (sp.get('auto') || '').split(',').map((s) => s.trim());
  const accept = req.headers.get('accept') || '';
  const avifOk = process.env.IMG_AVIF !== '0';
  let fm = (sp.get('fm') || '').toLowerCase().replace('jpg', 'jpeg');
  const autoFormat = !fm && auto.includes('format');
  if (autoFormat) {
    if (avifOk && accept.includes('image/avif')) fm = 'avif';
    else if (accept.includes('image/webp')) fm = 'webp';
  }
  if (!fm) fm = ext === 'jpg' ? 'jpeg' : ext;
  if (!['jpeg', 'png', 'webp', 'avif'].includes(fm)) fm = 'jpeg';
  let meta: Metadata;
  try {
    meta = await sharp(file, { failOn: 'none' }).rotate().metadata();
  } catch (e) {
    return bad(500, 'image processing failed: ' + (e as Error).message);
  }
  // auto=format for a client that cannot take the source's modern format: imgix falls back to JPEG
  // (MEASURED: AVIF og image + Accept */* → image/jpeg); PNG when the source has alpha (INFERRED).
  if (autoFormat && (fm === 'avif' || fm === 'webp') && !accept.includes(`image/${fm}`)) fm = meta.hasAlpha ? 'png' : 'jpeg';
  // fit=fill: without `fill=` imgix behaves like clip but rounds the derived side UP (MEASURED 2730×1888 →
  // w=800 ⇒ 800×554, w=4000&h=4000 ⇒ 4000×2767); with `fill=solid` it pads to exactly w×h in `fill-color`
  // (MEASURED default white).
  const fillMode = (sp.get('fill') || '').toLowerCase();
  const fillColor = parseColor(sp.get('fill-color')) ?? { r: 255, g: 255, b: 255, alpha: 1 };

  const key = createHash('sha1')
    .update(JSON.stringify([rel, stat.size, stat.mtimeMs, rect, w, h, fit, q, fm, fillMode, fillColor, 2]))
    .digest('hex');
  const cached = path.join(CACHE_DIR, `${key}.${fm}`);
  const headers: Record<string, string> = { 'content-type': MIME[fm], 'cache-control': LONG_CACHE };
  if (auto.includes('format') && !sp.get('fm')) headers.vary = 'Accept';

  try {
    const body = await fs.readFile(cached);
    return new Response(new Uint8Array(body), { headers: { ...headers, 'x-img-cache': 'HIT' } });
  } catch {}

  try {
    let img = sharp(file, { failOn: 'none' }).rotate();
    let iw = meta.autoOrient?.width ?? meta.width ?? 0;
    let ih = meta.autoOrient?.height ?? meta.height ?? 0;
    if (rect) {
      // MEASURED (imgix, 2730×1888 source, rect=2000,1500,2000,2000 → 2000×1888): the output is
      // min(rect, source) and the part of the rect outside the image is padded black at the right/bottom.
      const left = Math.min(rect.left, Math.max(0, iw - 1));
      const top = Math.min(rect.top, Math.max(0, ih - 1));
      const width = Math.max(1, Math.min(rect.width, iw - left));
      const height = Math.max(1, Math.min(rect.height, ih - top));
      const outW = Math.max(width, Math.min(rect.width, iw));
      const outH = Math.max(height, Math.min(rect.height, ih));
      let cropped = img.extract({ left, top, width, height });
      if (outW > width || outH > height) cropped = cropped.extend({ right: outW - width, bottom: outH - height, background: { r: 0, g: 0, b: 0, alpha: 1 } });
      img = sharp(await cropped.toBuffer(), { failOn: 'none' });
      iw = outW;
      ih = outH;
    }
    if (w || h) {
      switch (fit) {
        case 'crop':
          img = img.resize(w, h, { fit: w && h ? 'cover' : 'inside', position: 'centre' });
          break;
        case 'min':
          if (w && h && iw && ih && Math.max(w / iw, h / ih) > 1) {
            // never upscale: largest centred crop with the requested aspect ratio (MEASURED 2730×1888,
            // w=h=4000 ⇒ 1888×1888; rect 1000×500 + w=h=4000 ⇒ 500×500)
            const a = w / h;
            const [cw, ch] = iw / ih > a ? [Math.round(ih * a), ih] : [iw, Math.round(iw / a)];
            img = img.resize(cw, ch, { fit: 'cover', position: 'centre' });
          } else {
            img = img.resize(w, h, { fit: w && h ? 'cover' : 'inside', position: 'centre', withoutEnlargement: true });
          }
          break;
        case 'max':
          img = img.resize(w, h, { fit: 'inside', withoutEnlargement: true });
          break;
        case 'scale':
          img = img.resize(w, h, { fit: w && h ? 'fill' : 'inside' });
          break;
        case 'fill':
          if (fillMode === 'solid' && w && h) {
            img = img.resize(w, h, { fit: 'contain', background: fillColor });
          } else if (iw && ih) {
            const s = Math.min(w ? w / iw : Infinity, h ? h / ih : Infinity);
            const byW = w !== undefined && w / iw === s;
            const ow = byW ? w! : Math.ceil(iw * s - 1e-9);
            const oh = byW ? Math.ceil(ih * s - 1e-9) : h!;
            img = img.resize(ow, oh, { fit: 'fill' });
          } else {
            img = img.resize(w, h, { fit: 'inside' });
          }
          break;
        case 'clip':
        default:
          img = img.resize(w, h, { fit: 'inside' });
      }
    }
    if (fm === 'avif') img = img.avif({ quality: Math.max(1, Math.round(q * 0.75)), effort: 2 });
    else if (fm === 'webp') img = img.webp({ quality: q });
    else if (fm === 'png') img = img.png();
    else img = img.jpeg({ quality: q, mozjpeg: true });
    const out = await img.toBuffer();
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cached, out).catch(() => {});
    return new Response(new Uint8Array(out), { headers: { ...headers, 'x-img-cache': 'MISS' } });
  } catch (e) {
    return bad(500, 'image processing failed: ' + (e as Error).message);
  }
}
