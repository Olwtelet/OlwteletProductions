// Olwtelet Productions: generates every brand asset of the site from the owner's sources.
//   node scripts/brand/build-brand-assets.mjs [task …]      tasks: logo icons og notfound footer intro particles
//                                                           sequence team atlas cases veil (default: all)
// Sources (never edited by this script):
//   assets-src/brand/olwtelet-logo-source.png        the owner's attachment (1024², white mark on black)
//   src/content/brand-mark.ts                        the same mark as vector faces (IoU 0.9946 with the attachment)
//   src/content/brand.ts                             names, projects, categories, statuses
//   assets-src/projects/filmes-hd-online-gratis/*    captures of the live site (2026-11-16, see that folder's README)
// Raster logo files come from the attachment itself (luminance → alpha, optical crop). Vector files, renders and
// small icons come from the vector faces. Renders use Chrome (Playwright) with the site's own font files for text.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { BRAND, PROJECTS, KINDS, CATEGORIES, STATUS_LABEL } from '../../src/content/brand.ts';
import { MARK_FACES, MARK_VIEWBOX, MARK_PATH } from '../../src/content/brand-mark.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const sharp = require('sharp');
const { chromium } = require('playwright');

const P = (...p) => path.join(ROOT, ...p);
const ensure = (f) => fs.mkdirSync(path.dirname(f), { recursive: true });
const write = (f, buf) => {
  ensure(f);
  fs.writeFileSync(f, buf);
  return f;
};
const log = (...a) => console.log('[brand]', ...a);
const SRC_LOGO = P('assets-src/brand/olwtelet-logo-source.png');
const CAPTURES = P('assets-src/projects/filmes-hd-online-gratis');
const W0 = MARK_VIEWBOX.width;
const H0 = MARK_VIEWBOX.height;
const report = { generatedAt: new Date().toISOString(), fonts: {}, files: [] };
const note = (f) => report.files.push(path.relative(ROOT, f).replaceAll('\\', '/'));

// ------------------------------------------------------------------------------------------------ svg helpers
/** The mark as an SVG document: tight viewBox (plus optional padding), one fill colour. */
function markSvg({ fill = '#FFFFFF', pad = 0, title = BRAND.name, extraStyle = '' } = {}) {
  const px = pad * W0;
  const py = pad * H0;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-px} ${-py} ${W0 + 2 * px} ${H0 + 2 * py}" role="img" aria-label="${title}">` +
    `<title>${title}</title>${extraStyle ? `<style>${extraStyle}</style>` : ''}` +
    `<path class="m" fill="${fill}" fill-rule="evenodd" d="${MARK_PATH}"/></svg>`
  );
}
/** Square SVG: the mark centred on an optional rounded background, mark height = `k` of the side. */
function squareMarkSvg({ size = 1000, k = 0.78, fg = '#FFFFFF', bg = null, radius = 0.22 } = {}) {
  const h = size * k;
  const s = h / H0;
  const w = W0 * s;
  // optical centre: the mark's mass sits slightly left (tall slab); shift 2 % of the side to the right
  const tx = (size - w) / 2 + size * 0.02;
  const ty = (size - h) / 2;
  const rect = bg ? `<rect width="${size}" height="${size}" rx="${size * radius}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rect}<path fill="${fg}" fill-rule="evenodd" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(6)})" d="${MARK_PATH}"/></svg>`;
}

// ------------------------------------------------------------------------------------------------ logo (from the attachment)
async function taskLogo() {
  const { data, info } = await sharp(SRC_LOGO).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let minx = W, miny = H, maxx = -1, maxy = -1;
  const lum = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const l = Math.round(0.2126 * data[i * C] + 0.7152 * data[i * C + 1] + 0.0722 * data[i * C + 2]);
    lum[i] = l;
    if (l > 24) {
      const x = i % W, y = (i / W) | 0;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
  }
  // optical crop: the drawing's own box plus 3 % of its height on every side (no large margins)
  const pad = Math.round((maxy - miny + 1) * 0.03);
  const left = Math.max(0, minx - pad), top = Math.max(0, miny - pad);
  const cw = Math.min(W, maxx + pad + 1) - left, ch = Math.min(H, maxy + pad + 1) - top;
  log('logo source', `${W}×${H}`, 'drawing box', { minx, miny, maxx, maxy }, 'crop', { left, top, cw, ch });
  const rgba = (rgb) => {
    const out = Buffer.alloc(cw * ch * 4);
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        // luminance = coverage of the white drawing (anti-aliased edges kept); the JPEG-like noise floor (≤ 6) is cut
        const l = lum[(top + y) * W + left + x];
        const a = l <= 6 ? 0 : Math.min(255, Math.round(((l - 6) * 255) / 249));
        const o = (y * cw + x) * 4;
        out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; out[o + 3] = a;
      }
    return out;
  };
  for (const [name, rgb] of [['white', [255, 255, 255]], ['black', [0, 0, 0]]]) {
    const base = sharp(rgba(rgb), { raw: { width: cw, height: ch, channels: 4 } });
    const full = P(`public/brand/olwtelet-mark-${name}.png`);
    ensure(full);
    await base.clone().png({ compressionLevel: 9 }).toFile(full);
    note(full);
    for (const h of [512, 256, 128, 64]) {
      const f = P(`public/brand/olwtelet-mark-${name}-${h}.png`);
      await base.clone().resize({ height: h, kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(f);
      note(f);
    }
  }
  // the attachment as published (square, white on black) for places that want the full logo tile
  const tile = P('public/brand/olwtelet-logo-1024.png');
  await sharp(SRC_LOGO).png({ compressionLevel: 9 }).toFile(tile);
  note(tile);
  // vector files
  for (const [name, fill] of [['white', '#FFFFFF'], ['black', '#000000']]) note(write(P(`public/brand/olwtelet-mark-${name}.svg`), markSvg({ fill })));
  note(write(P('public/brand/olwtelet-mark.svg'), markSvg({ fill: 'currentColor' })));
}

// ------------------------------------------------------------------------------------------------ icons
function ico(pngs) {
  // ICONDIR + ICONDIRENTRY[] + PNG payloads (Vista+ PNG-in-ICO)
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(({ size, buf }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3); head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12);
    off += buf.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.buf)]);
}
async function taskIcons() {
  const png = (svg, size) => sharp(Buffer.from(svg), { density: 72 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  // favicon.ico: white mark on a black rounded tile (same contrast as the attachment) — readable on light and dark tabs
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) pngs.push({ size, buf: await png(squareMarkSvg({ size: 512, k: size <= 16 ? 0.84 : 0.8, bg: '#000000', radius: 0.18 }), size) });
  note(write(P('src/app/favicon.ico'), ico(pngs)));
  // icon.svg: no tile, follows the browser's colour scheme (black mark on light UI, white on dark)
  const adaptive = squareMarkSvg({ size: 1000, k: 0.92, fg: '#000000' }).replace(
    '<path ',
    '<style>path{fill:#000}@media (prefers-color-scheme: dark){path{fill:#fff}}</style><path ',
  );
  note(write(P('src/app/icon.svg'), adaptive));
  note(write(P('src/app/apple-icon.png'), await png(squareMarkSvg({ size: 1024, k: 0.66, bg: '#000000', radius: 0 }), 180)));
  for (const s of [192, 512]) note(write(P(`public/brand/icon-${s}.png`), await png(squareMarkSvg({ size: 1024, k: 0.66, bg: '#000000', radius: 0 }), s)));
  // maskable: safe zone 80 % → mark height 0.5
  note(write(P('public/brand/icon-maskable-512.png'), await png(squareMarkSvg({ size: 1024, k: 0.5, bg: '#000000', radius: 0 }), 512)));
}

// ------------------------------------------------------------------------------------------------ browser renderer
const FONT_FILES = {
  'Helvetica Now': [
    ['/fonts/HelveticaNowDisplay-Regular.woff', 400],
    ['/fonts/HelveticaNowDisplay-Medium.woff', 500],
    ['/fonts/HelveticaNowDisplay-Bold.woff', 700],
    ['/fonts/HelveticaNowDisplay-ExtraBold.woff', 800],
    ['/fonts/HelveticaNowDisplay-Black.woff', 900],
  ],
};
const RENDER_HTML = () => `<!doctype html><html><head><meta charset="utf-8">
<style>
${FONT_FILES['Helvetica Now'].map(([u, w]) => `@font-face{font-family:'Helvetica Now';src:url(${u}) format('woff');font-weight:${w};font-display:block}`).join('\n')}
html,body{margin:0;background:transparent}
</style>
<link rel="stylesheet" href="https://use.typekit.net/${process.env.NEXT_PUBLIC_TYPEKIT_KIT || 'gtx3zug'}.css">
</head><body>
<div style="font-family:'Helvetica Now';font-weight:400">a</div><div style="font-family:'Helvetica Now';font-weight:700">a</div>
<div style="font-family:'Helvetica Now';font-weight:900">a</div><div style="font-family:ballinger-mono;font-weight:700">a</div>
<script>
const FACES = ${JSON.stringify(MARK_FACES)};
const W0 = ${W0}, H0 = ${H0};
// pseudo normals of the drawing's faces (x right, y up, z towards the viewer) — used only for lighting renders
const NORMALS = {
  slab: [-0.42, 0.05, 0.9], blade: [0.55, 0.5, 0.67], innerLine: [0.15, 0.1, 1], crossbarTop: [0.05, 0.92, 0.4],
  crossbarFront: [-0.25, -0.05, 0.97], sideFace: [0.9, -0.1, 0.42], lowerFace: [0.65, -0.15, 0.74],
};
const MATERIALS = {
  porcelain: { base: [0.93, 0.92, 0.9], amb: 0.32, kd: 0.74, ks: 0.22, shin: 18 },
  chrome: { base: [0.6, 0.62, 0.66], amb: 0.1, kd: 0.3, ks: 1.15, shin: 70, env: true },
  graphite: { base: [0.21, 0.21, 0.22], amb: 0.38, kd: 0.6, ks: 0.85, shin: 45, rim: true },
  glass: { base: [0.72, 0.84, 0.92], amb: 0.16, kd: 0.36, ks: 1.0, shin: 80, alpha: 0.5, edges: true },
  copper: { base: [0.86, 0.53, 0.37], amb: 0.24, kd: 0.74, ks: 0.7, shin: 40 },
  signal: { base: [0.96, 0.96, 0.96], amb: 0.62, kd: 0.4, ks: 0.15, shin: 20, signal: true },
};
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (x) => Math.max(0, Math.min(1, x));
function shade(m, N, theta) {
  const L = norm([Math.sin(theta), 0.42, Math.cos(theta)]);
  const H = norm([L[0], L[1], L[2] + 1]);
  const n = norm(N);
  const d = Math.max(0, dot(n, L)), sp = Math.pow(Math.max(0, dot(n, H)), m.shin);
  return m.base.map((b) => Math.round(255 * clamp(b * (m.amb + m.kd * d) + m.ks * sp)));
}
/** Draws the mark (height h, top-left x,y) with material m lit from angle theta (rad). */
function drawMark(ctx, { x, y, h, material, theta, alpha = 1, outline = null }) {
  const m = MATERIALS[material];
  const s = h / H0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  if (m.signal) {
    // the owner's own treatment (olwtelet.vercel.app/favicon.svg): teal and red copies offset behind the white mark
    const ox = 20.81 * 1.6 * Math.sin(theta), oy = 12.48 * 1.6 * Math.sin(theta);
    for (const [c, dx, dy] of [['rgba(2,183,182,0.85)', ox, oy], ['rgba(183,2,2,0.85)', -ox, -oy]]) {
      ctx.save(); ctx.translate(dx, dy); ctx.fillStyle = c;
      for (const k in FACES) ctx.fill(new Path2D(FACES[k]), 'evenodd');
      ctx.restore();
    }
  }
  for (const k in FACES) {
    const p = new Path2D(FACES[k]);
    const c = shade(m, NORMALS[k], theta);
    ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (m.alpha ?? 1) + ')';
    ctx.fill(p, 'evenodd');
    if (m.env) {
      ctx.save(); ctx.clip(p, 'evenodd');
      const pos = 0.5 + 0.55 * Math.sin(theta) + (k === 'blade' ? 0.12 : k === 'sideFace' ? -0.1 : 0);
      const g = ctx.createLinearGradient(0, 0, W0, H0 * 0.35);
      const st = (o, a) => g.addColorStop(clamp(pos + o), 'rgba(255,255,255,' + a + ')');
      st(-0.3, 0); st(-0.06, 0.05); st(0, 0.7); st(0.05, 0.08); st(0.3, 0);
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W0, H0);
      ctx.restore();
    }
    if (m.rim || m.edges) {
      const facing = Math.max(0, dot(norm(NORMALS[k]), norm([Math.sin(theta), 0.42, Math.cos(theta)])));
      ctx.strokeStyle = 'rgba(255,255,255,' + (m.edges ? 0.55 : 0.12 + 0.45 * facing) + ')';
      ctx.lineWidth = m.edges ? 3.2 : 2.4;
      ctx.stroke(p);
    }
    if (outline) {
      // thin dark contour: keeps light faces readable on light backgrounds (invisible on dark ones)
      ctx.strokeStyle = outline;
      ctx.lineWidth = 4;
      ctx.stroke(p);
    }
  }
  ctx.restore();
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
window.R = {
  /** intro / sequence frame */
  frame({ w, h, k, material, theta, bg = '#000000', vignette = false }) {
    const c = canvas(w, h), ctx = c.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    if (vignette) {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    const mh = Math.min(h * k, (w * 0.86) * H0 / W0);
    const mw = mh * W0 / H0;
    drawMark(ctx, { x: (w - mw) / 2 + mw * 0.02, y: (h - mh) / 2, h: mh, material, theta });
    return c.toDataURL('image/png');
  },
  /** arbitrary scene: list of ops */
  scene({ w, h, ops }) {
    const c = canvas(w, h), ctx = c.getContext('2d');
    for (const op of ops) {
      ctx.save();
      if (op.alpha != null) ctx.globalAlpha = op.alpha;
      if (op.t === 'fill') { ctx.fillStyle = op.c; ctx.fillRect(op.x ?? 0, op.y ?? 0, op.w ?? w, op.h ?? h); }
      if (op.t === 'radial') { const g = ctx.createRadialGradient(op.x, op.y, 0, op.x, op.y, op.r); g.addColorStop(0, op.c0); g.addColorStop(1, op.c1); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
      if (op.t === 'mark') drawMark(ctx, op);
      if (op.t === 'markFlat') { ctx.translate(op.x, op.y); const s = op.h / H0; ctx.scale(s, s); ctx.fillStyle = op.c; for (const k in FACES) ctx.fill(new Path2D(FACES[k]), 'evenodd'); }
      if (op.t === 'text') {
        ctx.font = op.font; ctx.fillStyle = op.c; ctx.textAlign = op.align || 'left'; ctx.textBaseline = op.base || 'alphabetic';
        if (op.ls != null) ctx.letterSpacing = op.ls + 'px';
        const lines = String(op.s).split('\\n');
        lines.forEach((ln, i) => ctx.fillText(ln, op.x, op.y + i * (op.lh || 0)));
      }
      if (op.t === 'line') { ctx.strokeStyle = op.c; ctx.lineWidth = op.lw || 1; if (op.dash) ctx.setLineDash(op.dash); ctx.beginPath(); ctx.moveTo(op.x1, op.y1); ctx.lineTo(op.x2, op.y2); ctx.stroke(); }
      if (op.t === 'rect') { ctx.strokeStyle = op.c; ctx.lineWidth = op.lw || 1; if (op.dash) ctx.setLineDash(op.dash); ctx.strokeRect(op.x, op.y, op.w, op.h); }
      if (op.t === 'box') { ctx.fillStyle = op.c; ctx.fillRect(op.x, op.y, op.w, op.h); }
      if (op.t === 'dot') { ctx.fillStyle = op.c; ctx.beginPath(); ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2); ctx.fill(); }
      if (op.t === 'pill') {
        ctx.font = op.font; if (op.ls != null) ctx.letterSpacing = op.ls + 'px';
        const tw = ctx.measureText(op.s).width; const pw = tw + op.px * 2; const r = op.h / 2;
        ctx.beginPath(); ctx.roundRect(op.x, op.y, pw, op.h, r);
        if (op.fill) { ctx.fillStyle = op.fill; ctx.fill(); }
        if (op.stroke) { ctx.strokeStyle = op.stroke; ctx.lineWidth = op.lw || 1; ctx.stroke(); }
        ctx.fillStyle = op.c; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(op.s, op.x + op.px, op.y + op.h / 2 + (op.dy || 0));
        window.__lastPillW = pw;
      }
      if (op.t === 'image') { /* drawn by node (sharp) */ }
      ctx.restore();
    }
    return c.toDataURL('image/png');
  },
  measure(font, s, ls) { const ctx = canvas(10, 10).getContext('2d'); ctx.font = font; if (ls != null) ctx.letterSpacing = ls + 'px'; return ctx.measureText(s).width; },
};
</script></body></html>`;

let server, browser, page, baseUrl;
async function renderer() {
  if (page) return page;
  server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (u === '/__render.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(RENDER_HTML());
    }
    const f = path.join(ROOT, 'public', u);
    if (!f.startsWith(path.join(ROOT, 'public')) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404);
      return res.end();
    }
    const type = f.endsWith('.woff') ? 'font/woff' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'access-control-allow-origin': '*' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://localhost:${server.address().port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  page.on('request', (r) => {
    if (r.method() !== 'GET') throw new Error('non-GET request ' + r.url());
  });
  await page.goto(`${baseUrl}/__render.html`, { waitUntil: 'networkidle' });
  // load every weight before drawing (canvas text does not trigger a load; an unloaded weight falls back to a serif)
  await page.evaluate(async () => {
    for (const w of [400, 500, 700, 800, 900]) await document.fonts.load(`${w} 32px 'Helvetica Now'`);
    await document.fonts.load("700 32px ballinger-mono").catch(() => {});
    await document.fonts.ready;
  });
  report.fonts = await page.evaluate(() => ({
    helveticaNow: document.fonts.check("700 20px 'Helvetica Now'") && [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Helvetica Now' && f.status === 'loaded'),
    ballingerMono: [...document.fonts].some((f) => /ballinger-mono/i.test(f.family) && f.status === 'loaded'),
  }));
  log('fonts', report.fonts);
  return page;
}
const MONO = () => (report.fonts.ballingerMono ? 'ballinger-mono' : 'Consolas, monospace');
const dataUrlToBuf = (d) => Buffer.from(d.split(',')[1], 'base64');
async function frame(opts) {
  const p = await renderer();
  return dataUrlToBuf(await p.evaluate((o) => window.R.frame(o), opts));
}
async function scene(w, h, ops) {
  const p = await renderer();
  return dataUrlToBuf(await p.evaluate((o) => window.R.scene(o), { w, h, ops }));
}
async function measure(font, s, ls) {
  const p = await renderer();
  return p.evaluate(([f, t, l]) => window.R.measure(f, t, l), [font, s, ls]);
}

// ------------------------------------------------------------------------------------------------ og / 404 / footer
async function taskOg() {
  const w = 1200, h = 630;
  const mh = 400;
  const ops = [
    { t: 'fill', c: '#000000' },
    { t: 'markFlat', x: 104, y: (h - mh) / 2, h: mh, c: '#FFFFFF' },
    { t: 'text', s: 'OLWTELET\nPRODUCTIONS', x: 500, y: 272, lh: 80, font: "900 82px 'Helvetica Now'", c: '#FFFFFF', ls: -1.5 },
    { t: 'text', s: BRAND.signature, x: 503, y: 410, font: "400 32px 'Helvetica Now'", c: '#BDBDBD' },
    { t: 'text', s: BRAND.location.label.toUpperCase(), x: 503, y: 520, font: `700 18px ${MONO()}`, c: '#8A8A8A', ls: 1 },
  ];
  const buf = await scene(w, h, ops);
  const f = P('public/brand/og.png');
  ensure(f);
  await sharp(buf).png({ compressionLevel: 9 }).toFile(f);
  note(f);
}
async function taskNotFound() {
  const w = 3000, h = 1860;
  const buf = await scene(w, h, [
    { t: 'fill', c: '#161616' },
    { t: 'radial', x: w * 0.5, y: h * 0.45, r: w * 0.6, c0: 'rgba(255,255,255,0.07)', c1: 'rgba(0,0,0,0)' },
    { t: 'mark', x: (w - (h * 0.78 * W0) / H0) / 2, y: h * 0.1, h: h * 0.78, material: 'graphite', theta: 0.85, alpha: 0.9 },
  ]);
  const f = P('public/brand/404.jpg');
  ensure(f);
  await sharp(buf).jpeg({ quality: 82, mozjpeg: true }).toFile(f);
  note(f);
}
async function taskFooter() {
  const w = 440, h = 890;
  const mw = 400, mh = (mw * H0) / W0;
  for (const [name, material, theta] of [['porcelain', 'porcelain', -0.6], ['signal', 'signal', 0.55]]) {
    const buf = await scene(w, h, [{ t: 'mark', x: (w - mw) / 2, y: (h - mh) / 2, h: mh, material, theta, outline: 'rgba(28,28,28,0.9)' }]);
    const f = P(`public/brand/footer-mark-${name}.png`);
    ensure(f);
    await sharp(buf).png({ compressionLevel: 9 }).toFile(f);
    note(f);
  }
}

// ------------------------------------------------------------------------------------------------ intro frames
export const INTRO = {
  frames: 25,
  desktop: ['porcelain', 'chrome', 'graphite', 'glass', 'copper', 'signal'],
  mobile: ['porcelain', 'chrome', 'signal'],
};
async function taskIntro() {
  const out = P('public/assets/intro');
  fs.rmSync(out, { recursive: true, force: true });
  const theta = (i) => (-75 + (150 * i) / (INTRO.frames - 1)) * (Math.PI / 180);
  for (const [variant, list, w, h, k] of [['', INTRO.desktop, 1920, 1080, 0.72], ['mobile/', INTRO.mobile, 1080, 1920, 0.5]]) {
    for (let s = 0; s < list.length; s++)
      for (let i = 0; i < INTRO.frames; i++) {
        const buf = await frame({ w, h, k, material: list[s], theta: theta(i), vignette: true });
        const f = path.join(out, `${variant}set${s + 1}`, `${i}.webp`);
        ensure(f);
        await sharp(buf).webp({ quality: 86, effort: 5 }).toFile(f);
      }
    log('intro', variant || 'desktop/', list.length, 'sets ×', INTRO.frames);
  }
  note(out);
  write(path.join(out, 'sets.json'), JSON.stringify({ frames: INTRO.frames, desktop: INTRO.desktop, mobile: INTRO.mobile }, null, 2));
}

// ------------------------------------------------------------------------------------------------ particles (GLB)
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function facePolys() {
  const out = {};
  for (const [k, d] of Object.entries(MARK_FACES)) {
    const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
    const pts = [];
    for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
    out[k] = pts;
  }
  return out;
}
function polyArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
async function taskParticles() {
  const polys = facePolys();
  const rand = rng(20261116);
  // depth (z, drawing units ≈ px of the 978-tall drawing) per face: gives the cloud volume when the intro rotates it
  const Z = { slab: [-60, 60], blade: [-24, 24], innerLine: [-8, 8], crossbarTop: [24, 52], crossbarFront: [30, 74], sideFace: [-10, 70], lowerFace: [0, 50] };
  const TOTAL = 4800;
  const areas = Object.fromEntries(Object.entries(polys).map(([k, p]) => [k, polyArea(p)]));
  const sum = Object.values(areas).reduce((a, b) => a + b, 0);
  const pts = [];
  for (const [k, poly] of Object.entries(polys)) {
    const n = Math.max(90, Math.round((TOTAL * 0.72 * areas[k]) / sum));
    const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    let got = 0, guard = 0;
    while (got < n && guard++ < n * 400) {
      const x = x0 + rand() * (x1 - x0), y = y0 + rand() * (y1 - y0);
      if (!pointInPoly(x, y, poly)) continue;
      pts.push([x, y, Z[k][0] + rand() * (Z[k][1] - Z[k][0])]);
      got++;
    }
    // outline points: crisp silhouette (28 % of the budget, by perimeter)
    let per = 0;
    for (let i = 0; i < poly.length; i++) per += Math.hypot(poly[(i + 1) % poly.length][0] - poly[i][0], poly[(i + 1) % poly.length][1] - poly[i][1]);
    const m = Math.max(40, Math.round((TOTAL * 0.28 * per) / 9000));
    for (let j = 0; j < m; j++) {
      let t = rand() * per;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (t <= l) {
          const u = t / (l || 1);
          pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Z[k][0] + rand() * (Z[k][1] - Z[k][0])]);
          break;
        }
        t -= l;
      }
    }
  }
  while (pts.length % 3) pts.push(pts[pts.length - 1]);
  // centre at the origin, y up, 200 units tall (the intro scales raw positions by 0.012, as with the former model)
  const s = 200 / H0;
  const pos = new Float32Array(pts.length * 3);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  pts.forEach(([x, y, z], i) => {
    const v = [(x - W0 / 2) * s, -(y - H0 / 2) * s, z * s * 2.8]; // depth exaggerated: the drawing is flat
    for (let a = 0; a < 3; a++) {
      pos[i * 3 + a] = v[a];
      min[a] = Math.min(min[a], v[a]);
      max[a] = Math.max(max[a], v[a]);
    }
  });
  const bin = Buffer.from(pos.buffer);
  const json = {
    asset: { version: '2.0', generator: 'olwtelet scripts/brand/build-brand-assets.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'olwtelet-mark' }],
    meshes: [{ name: 'olwtelet-mark', primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: pts.length, type: 'VEC3', min, max }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.length, target: 34962 }],
    buffers: [{ byteLength: bin.length }],
  };
  let jbuf = Buffer.from(JSON.stringify(json));
  if (jbuf.length % 4) jbuf = Buffer.concat([jbuf, Buffer.alloc(4 - (jbuf.length % 4), 0x20)]);
  const hdr = Buffer.alloc(12);
  hdr.writeUInt32LE(0x46546c67, 0); hdr.writeUInt32LE(2, 4); hdr.writeUInt32LE(12 + 8 + jbuf.length + 8 + bin.length, 8);
  const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
  const glb = Buffer.concat([hdr, ch(jbuf.length, 0x4e4f534a), jbuf, ch(bin.length, 0x004e4942), bin]);
  note(write(P('public/assets/models/olwtelet-mark.glb'), glb));
  log('particles', pts.length, 'points', { min, max });
}

// ------------------------------------------------------------------------------------------------ particle sprite
async function taskSprite() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#fff"/><defs><radialGradient id="g" cx="0.5" cy="0.3" r="0.8" fx="0.5" fy="0.2"><stop offset="0" stop-color="#f2f2ee"/><stop offset="0.42" stop-color="#cfd0ca"/><stop offset="0.78" stop-color="#535654"/><stop offset="1" stop-color="#151717"/></radialGradient></defs><circle cx="512" cy="512" r="511" fill="url(#g)"/></svg>`;
  note(write(P('public/assets/images/particle.jpg'), await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()));
}

// ------------------------------------------------------------------------------------------------ About sequence + team
async function taskSequence() {
  const out = P('public/assets/about/sequence');
  fs.rmSync(out, { recursive: true, force: true });
  for (let i = 1; i <= 50; i++) {
    const theta = (-80 + (160 * (i - 1)) / 49) * (Math.PI / 180);
    const buf = await frame({ w: 1920, h: 1080, k: 0.78, material: 'porcelain', theta, bg: '#202020' });
    const f = path.join(out, `olwtelet-mark-${String(i).padStart(4, '0')}.webp`);
    ensure(f);
    await sharp(buf).webp({ quality: 84, effort: 5 }).toFile(f);
  }
  note(out);
}
async function taskTeam() {
  // FaceParticles masks: a particle shows where (1 − depth.b) > 0.3 and the colour luminance > 0.015.
  // Depth: darker = nearer, white background; colour: lit faces on black.
  const size = 256, mh = 216, mw = (mh * W0) / H0;
  const x = (size - mw) / 2 + mw * 0.02, y = (size - mh) / 2;
  const DEPTH = { slab: 0.42, blade: 0.32, innerLine: 0.36, crossbarTop: 0.2, crossbarFront: 0.12, sideFace: 0.26, lowerFace: 0.3 };
  const s = mh / H0;
  const depthSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="#fff"/><g transform="translate(${x} ${y}) scale(${s})">${Object.entries(MARK_FACES)
    .map(([k, d]) => { const v = Math.round(255 * DEPTH[k]); return `<path fill="rgb(${v},${v},${v})" fill-rule="evenodd" d="${d}"/>`; })
    .join('')}</g></svg>`;
  note(write(P('public/assets/about/team/olwtelet-depth-256.webp'), await sharp(Buffer.from(depthSvg)).webp({ lossless: true }).toBuffer()));
  const colour = await scene(size, size, [{ t: 'fill', c: '#000000' }, { t: 'mark', x, y, h: mh, material: 'porcelain', theta: -0.5 }]);
  note(write(P('public/assets/about/team/olwtelet-colour-256.webp'), await sharp(colour).webp({ lossless: true }).toBuffer()));
}

// ------------------------------------------------------------------------------------------------ project images
const CASE_DIR = 'public/projects/filmes-hd-online-gratis';
export const CASE_IMAGES = {
  hero: 'd-home',
  desktop: ['d-programacao', 'd-sessao', 'd-sessao-18', 'd-sessao-50', 'd-sessao-70', 'd-sessao-86', 'd-sobre', 'd-home-drag'],
  mobile: ['m-home', 'm-programacao', 'm-sessao-18', 'm-sessao-70', 'm-sobre', 'm-sessao-86'],
};
async function taskCases() {
  const out = P(CASE_DIR);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const n of [CASE_IMAGES.hero, ...CASE_IMAGES.desktop]) {
    const f = path.join(out, `${n}.jpg`);
    await sharp(path.join(CAPTURES, `${n}.jpg`)).resize({ width: 2400 }).jpeg({ quality: 84, mozjpeg: true }).toFile(f);
  }
  for (const n of CASE_IMAGES.mobile) await sharp(path.join(CAPTURES, `${n}.jpg`)).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(out, `${n}.jpg`));
  // Open Graph: the working interface (home with the current session), 1200×630
  await sharp(path.join(CAPTURES, 'd-home.jpg')).resize(1200, 630, { fit: 'cover', position: 'north' }).jpeg({ quality: 84, mozjpeg: true }).toFile(P('public/brand/og-filmes-hd-online-gratis.jpg'));
  note(out);
  note(P('public/brand/og-filmes-hd-online-gratis.jpg'));
}

// Veil: typographic composition, labelled as a project presentation (no gameplay exists to capture)
// `dark`: the discreet version of the work-grid thumbnail (an entry in development must not outshine the published
// project); the Veil page and its Open Graph image keep the light paper version.
function veilOps(w, h, { square = false, dark = false } = {}) {
  const [ink, paper, line, veil] = dark
    ? ['#CFCBC3', '#121212', 'rgba(207,203,195,0.16)', 'rgba(207,203,195,0.05)']
    : ['#111111', '#E4E2DD', 'rgba(17,17,17,0.22)', 'rgba(17,17,17,0.07)'];
  const ops = [{ t: 'fill', c: paper }];
  const n = 8;
  const side = square ? w * 0.62 : h * 0.66;
  const gx = square ? (w - side) / 2 : w - side - w * 0.08;
  const gy = square ? h * 0.13 : (h - side) / 2;
  const cell = side / n;
  // a few veiled squares (no pieces, no board state: a graphic reference to the chess grid only)
  const veiled = [[1, 2], [2, 5], [3, 3], [4, 4], [5, 1], [6, 6], [2, 1], [5, 5], [6, 3]];
  for (const [r, c] of veiled) ops.push({ t: 'box', c: veil, x: gx + c * cell, y: gy + r * cell, w: cell, h: cell });
  for (let i = 0; i <= n; i++) {
    ops.push({ t: 'line', c: line, lw: square ? 1.5 : 1.5, x1: gx + i * cell, y1: gy, x2: gx + i * cell, y2: gy + side });
    ops.push({ t: 'line', c: line, lw: square ? 1.5 : 1.5, x1: gx, y1: gy + i * cell, x2: gx + side, y2: gy + i * cell });
  }
  const mono = MONO();
  if (square) {
    ops.push({ t: 'text', s: 'VEIL', x: w / 2, y: h * 0.93, font: `900 ${Math.round(w * 0.2)}px 'Helvetica Now'`, c: ink, align: 'center', ls: -Math.round(w * 0.006) });
  } else {
    ops.push({ t: 'text', s: 'VEIL', x: w * 0.06, y: h * 0.86, font: `900 ${Math.round(h * 0.34)}px 'Helvetica Now'`, c: ink, ls: -Math.round(h * 0.008) });
    ops.push({ t: 'text', s: 'APRESENTAÇÃO DO PROJETO', x: w * 0.06, y: h * 0.12, font: `700 ${Math.round(h * 0.022)}px ${mono}`, c: ink, ls: 1 });
    ops.push({ t: 'text', s: STATUS_LABEL['in-development'].toUpperCase(), x: w * 0.06, y: h * 0.12 + h * 0.036, font: `700 ${Math.round(h * 0.022)}px ${mono}`, c: 'rgba(17,17,17,0.55)', ls: 1 });
    ops.push({ t: 'text', s: 'Jogo de estratégia para navegador\ninspirado no xadrez.', x: w * 0.06, y: h * 0.36, lh: h * 0.05, font: `500 ${Math.round(h * 0.04)}px 'Helvetica Now'`, c: ink });
    ops.push({ t: 'text', s: 'COMPOSIÇÃO GRÁFICA, NÃO É CAPTURA DO JOGO', x: gx + side, y: gy + side + h * 0.05, font: `700 ${Math.round(h * 0.022)}px ${mono}`, c: dark ? 'rgba(207,203,195,0.6)' : 'rgba(17,17,17,0.6)', align: 'right', ls: 1 });
  }
  return ops;
}
async function taskVeil() {
  const out = P('public/projects/veil');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const hero = await scene(2400, 1350, veilOps(2400, 1350));
  await sharp(hero).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(out, 'veil-apresentacao.jpg'));
  const og = await scene(1200, 630, veilOps(1200, 630));
  await sharp(og).jpeg({ quality: 86, mozjpeg: true }).toFile(P('public/brand/og-veil.jpg'));
  note(out);
  note(P('public/brand/og-veil.jpg'));
}

// ------------------------------------------------------------------------------------------------ work-grid atlas
// One image pack, 6×6 cells (shader GRID_SIZE 6): media 2040² (340-px cells, the tile shows the central 70 %),
// alpha 2040² (red = alpha), labels 4096² (682.67-px cells, white on transparent, drawn over the whole tile at 0.8).
// Cells 0-1: the two projects (blueprint order = PROJECTS order); cells 2-6: the empty-cell designs.
export const EMPTY_VARIANTS = ['corners', 'cross', 'frame', 'dots', 'surface'];
async function taskAtlas() {
  const out = P('public/assets/workgrid');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const M = 2040, MC = M / 6, LA = 4096, LC = LA / 6;
  const cellOf = (k) => ({ row: Math.floor(k / 6), col: k % 6 });

  // media + alpha
  const media = [];
  const alpha = [];
  const proj = PROJECTS.map((p, k) => ({ p, k, ...cellOf(k) }));
  for (const { p, row, col } of proj) {
    let buf;
    if (p.uid === 'filmes-hd-online-gratis') {
      // the working interface: logo, session date, title and credits table of the home (left 1800 px of 2880×1800)
      buf = await sharp(path.join(CAPTURES, 'd-home.jpg')).extract({ left: 0, top: 0, width: 1800, height: 1800 }).resize(MC, MC).png().toBuffer();
    } else {
      buf = await sharp(await scene(1200, 1200, veilOps(1200, 1200, { square: true, dark: true }))).resize(MC, MC).png().toBuffer();
    }
    media.push({ input: buf, left: col * MC, top: row * MC });
    alpha.push({ input: await sharp({ create: { width: MC, height: MC, channels: 3, background: '#ffffff' } }).png().toBuffer(), left: col * MC, top: row * MC });
  }
  EMPTY_VARIANTS.forEach((v, i) => {
    const { row, col } = cellOf(PROJECTS.length + i);
    if (v === 'surface') {
      // a discreet surface: near-black, 55 % opaque over the tile's black
      media.push({ input: { create: { width: MC, height: MC, channels: 3, background: '#101010' } }, left: col * MC, top: row * MC });
      alpha.push({ input: { create: { width: MC, height: MC, channels: 3, background: '#8c8c8c' } }, left: col * MC, top: row * MC });
    }
  });
  const mediaBuf = await sharp({ create: { width: M, height: M, channels: 3, background: '#000000' } }).composite(media).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  note(write(path.join(out, 'media-rgb-atlas-0.jpg'), mediaBuf));
  const alphaBuf = await sharp({ create: { width: M, height: M, channels: 3, background: '#000000' } }).composite(alpha).jpeg({ quality: 95 }).toBuffer();
  note(write(path.join(out, 'media-alpha-atlas-0.jpg'), alphaBuf));

  // labels (sizes from the former atlas: title ~15 px bold mono at top-right 0.97, pills 36 px tall at the bottom-left,
  // client mark top-left, year → status at the bottom-right)
  const mono = MONO();
  const ops = [];
  const F = (px) => `700 ${px}px ${mono}`;
  for (const { p, row, col } of proj) {
    const x0 = col * LC, y0 = row * LC;
    const mh = 34;
    ops.push({ t: 'markFlat', x: x0 + 22, y: y0 + 18, h: mh, c: '#FFFFFF' });
    ops.push({ t: 'text', s: p.title.toUpperCase(), x: x0 + LC * 0.97, y: y0 + 40, font: F(15), c: '#FFFFFF', align: 'right', ls: 0.4 });
    const pills = [KINDS[p.kind], ...p.categories.map((c) => CATEGORIES[c])].slice(0, 3).map((s) => s.toUpperCase());
    let px = x0 + 18;
    const py = y0 + LC - 52;
    for (let i = 0; i < pills.length; i++) {
      const tw = await measure(F(13), pills[i], 0.4);
      ops.push({ t: 'pill', s: pills[i], x: px, y: py, h: 36, px: 14, font: F(13), ls: 0.4, c: '#FFFFFF', fill: i === 0 ? '#000000' : '#333333', stroke: i === 0 ? '#3a3a3a' : null, lw: 1.5, dy: 1 });
      px += tw + 28 + 8;
    }
    ops.push({ t: 'text', s: STATUS_LABEL[p.status].toUpperCase(), x: x0 + LC * 0.97, y: y0 + LC - 26, font: F(15), c: '#FFFFFF', align: 'right', ls: 0.4 });
  }
  EMPTY_VARIANTS.forEach((v, i) => {
    const { row, col } = cellOf(PROJECTS.length + i);
    const x0 = col * LC, y0 = row * LC, c = 'rgba(255,255,255,0.22)';
    const m0 = LC * 0.15, m1 = LC * 0.85; // media area (central 70 %)
    if (v === 'corners') {
      const L = 22, I = 26;
      for (const [cx, cy, sx, sy] of [[x0 + I, y0 + I, 1, 1], [x0 + LC - I, y0 + I, -1, 1], [x0 + I, y0 + LC - I, 1, -1], [x0 + LC - I, y0 + LC - I, -1, -1]]) {
        ops.push({ t: 'line', c, lw: 1.5, x1: cx, y1: cy, x2: cx + sx * L, y2: cy });
        ops.push({ t: 'line', c, lw: 1.5, x1: cx, y1: cy, x2: cx, y2: cy + sy * L });
      }
    } else if (v === 'cross') {
      const cx = x0 + LC / 2, cy = y0 + LC / 2, L = 12;
      ops.push({ t: 'line', c, lw: 1.5, x1: cx - L, y1: cy, x2: cx + L, y2: cy });
      ops.push({ t: 'line', c, lw: 1.5, x1: cx, y1: cy - L, x2: cx, y2: cy + L });
    } else if (v === 'frame') {
      ops.push({ t: 'rect', c: 'rgba(255,255,255,0.14)', lw: 1.5, dash: [4, 10], x: x0 + m0, y: y0 + m0, w: m1 - m0, h: m1 - m0 });
    } else if (v === 'dots') {
      for (const fx of [m0, LC / 2, m1]) for (const fy of [m0, LC / 2, m1]) ops.push({ t: 'dot', c, x: x0 + fx, y: y0 + fy, r: 1.8 });
    }
    // 'surface': the dark square of the media atlas only
  });
  const labels = await scene(LA, LA, ops);
  note(write(path.join(out, 'label-atlas-0.png'), await sharp(labels).png({ compressionLevel: 9 }).toBuffer()));

  const blueprint = {
    $meta: {
      generator: 'scripts/brand/build-brand-assets.mjs (task atlas)',
      layout: '6×6 cells per atlas; cellX = atlas row from the top, cellY = column (shader convention)',
      fonts: report.fonts,
    },
    atlases: [{ type: 'image', mediaAtlas: '/assets/workgrid/media-rgb-atlas-0.jpg', mediaAlphaAtlas: '/assets/workgrid/media-alpha-atlas-0.jpg', labelsAtlas: '/assets/workgrid/label-atlas-0.png' }],
    cells: proj.map(({ p, row, col }) => ({ id: p.id, uid: p.uid, title: p.title, atlas: { index: 0, cellX: row, cellY: col } })),
    emptyCells: EMPTY_VARIANTS.map((v, i) => {
      const { row, col } = cellOf(PROJECTS.length + i);
      return { variant: v, atlas: { index: 0, cellX: row, cellY: col } };
    }),
  };
  note(write(P('src/content/blueprint.json'), JSON.stringify(blueprint, null, 2) + '\n'));
}

// ------------------------------------------------------------------------------------------------ main
const TASKS = { sprite: taskSprite, logo: taskLogo, icons: taskIcons, og: taskOg, notfound: taskNotFound, footer: taskFooter, intro: taskIntro, particles: taskParticles, sequence: taskSequence, team: taskTeam, cases: taskCases, veil: taskVeil, atlas: taskAtlas };
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TASKS);
try {
  for (const t of want) {
    if (!TASKS[t]) throw new Error(`unknown task ${t}`);
    const t0 = Date.now();
    await TASKS[t]();
    log(`${t} done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  const rep = P('assets-src/brand/last-build.json');
  const prev = fs.existsSync(rep) ? JSON.parse(fs.readFileSync(rep, 'utf8')) : {};
  write(rep, JSON.stringify({ ...prev, ...report, tasks: want, files: [...new Set([...(prev.files || []), ...report.files])].sort() }, null, 2) + '\n');
} finally {
  await browser?.close();
  server?.close();
}
