// imgix emulation (images.prismic.io is imgix): GET /api/img?src=<local public url | original url>&rect=x,y,w,h
//   &w=&h=&fit=crop|max|clip|min|scale|fill&q=&auto=format[&fm=webp|avif|jpg|png]
// Reads ONLY files under /public (site-root files such as /projects/…, /brand/…; next.config.ts traces them into this
// function). Results are served with a 1-year immutable Cache-Control and, when a writable directory exists, kept in a
// disk cache (<sha1>.<ext>). The cache is best effort: reading or writing it never decides the response.
// MEASURED 2026-11-19 on the Vercel deployment: the function's filesystem is read-only outside /tmp, mkdir of
// /var/task/.cache failed (ENOENT) inside the processing try, and every resized image was answered 500.
// Semantics (imgix docs): rect crops the source first; fit=clip (default) fits inside w×h keeping the aspect
// ratio (may upscale); max = clip without upscaling; crop = cover + centre crop; min = cover without upscaling;
// scale = exact w×h (distort); fill = clip with the derived side rounded up, or exact w×h padded with
// fill-color (default white) when fill=solid. q default 75. auto=format → AVIF if the Accept header allows
// it, else WebP, else the source format (JPEG when the source is AVIF/WebP). Audit 2026-11-06: output sizes
// checked against images.prismic.io for 24+ parameter sets (scripts/foundation/img-imgix-compare.mjs).
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { publicFilePath } from '@/lib/media.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// On Vercel only /tmp is writable (and it lives only as long as the function instance); locally, the project's .cache.
// The cache helpers take a file NAME and build the path from CACHE_DIR themselves, with literal directories: an fs call
// on a path the file tracer cannot follow (a parameter holding a whole path, os.tmpdir()) makes it trace the whole
// project (MEASURED: "Dynamic filesystem access causes tracing of the whole project", ~13 500 files in this route's
// trace).
const CACHE_DIR = process.env.VERCEL ? '/tmp/olwtelet-img' : path.join(process.cwd(), '.cache', 'img');

/** Cached result for `name` (<sha1>.<ext>), or null when there is none, it is empty or the cache cannot be read. */
async function cacheRead(name: string): Promise<Buffer | null> {
  try {
    const buf = await fs.readFile(path.join(CACHE_DIR, name));
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

/** Keeps a result for later requests when the cache directory can be created and written; never throws. The file is
 *  written under a unique temporary name and renamed into place, so a concurrent request for the same key reads either
 *  nothing (a miss) or the whole image, never a partly written one. */
async function cacheWrite(name: string, data: Buffer): Promise<void> {
  const tmp = `${name}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, tmp), data);
    await fs.rename(path.join(CACHE_DIR, tmp), path.join(CACHE_DIR, name));
  } catch {
    // no writable cache here (or the rename lost a race): the image is still returned
    await fs.unlink(path.join(CACHE_DIR, tmp)).catch(() => {});
  }
}
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
  const cacheName = `${key}.${fm}`;
  const headers: Record<string, string> = { 'content-type': MIME[fm], 'cache-control': LONG_CACHE };
  if (auto.includes('format') && !sp.get('fm')) headers.vary = 'Accept';

  const hit = await cacheRead(cacheName);
  if (hit) return new Response(new Uint8Array(hit), { headers: { ...headers, 'x-img-cache': 'HIT' } });

  let out: Buffer;
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
    out = await img.toBuffer();
  } catch (e) {
    return bad(500, 'image processing failed: ' + (e as Error).message);
  }
  await cacheWrite(cacheName, out);
  return new Response(new Uint8Array(out), { headers: { ...headers, 'x-img-cache': 'MISS' } });
}
