// Objective flicker measurement of the home grid lines in motion (local server, GET only, normal browser settings).
//   node grid-flicker.mjs <outDir> [configs: d1440x1,d1440x2,w2560x1,t768x2,m390x2] [--pin-high]
// --pin-high (test only): when another program loads the GPU, the page's PerformanceMonitor drops to the LOW tier (no
// post-processing). The flag puts the HIGH tier back through the __WG_DEBUG__ store before every captured frame and records
// each decline (env.pin), so the lines are measured on the same render path as the baseline.
// Drags the grid in 1 px steps (slow drag) and captures every step after two frames; then a fast drag + release and
// captures the inertia tail. For a region of empty cells (away from the two project tiles and the fixed controls):
//   E      total luminance of the region per frame; with steady (antialiased) lines it barely changes when the grid moves
//          a pixel; lines that pop on/off make it jump.
//   E_cv   coefficient of variation of E over the slow drag;  dE = mean |E(t) − E(t−1)| / mean E (frame-to-frame jumps)
//   peak   99.5th percentile luminance per frame (line brightness); peak_cv over the slow drag
//   lines  per frame, number of columns/rows whose mean luminance stands out (line count stability)
// Also records the graphics tier and the render target vs drawing buffer sizes (window.__WG_DEBUG__ hooks).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const sharp = require('sharp');
const BASE = 'http://localhost:3000';
const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const ALL = {
  d1440x1: [1440, 900, 1, false],
  d1440x2: [1440, 900, 2, false],
  w2560x1: [2560, 1440, 1, false],
  t768x2: [768, 1024, 2, false],
  m390x2: [390, 844, 2, true],
  d1440r: [1440, 900, 1, false, 1680, 1050], // loaded at 1680 × 1050, then the window shrinks
};
const PIN_HIGH = process.argv.includes('--pin-high');
const ONLY = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3].split(',') : Object.keys(ALL);
// HIGH (0) back in the store if the PerformanceMonitor declined; returns 1 when it had to be put back
const pin = (p) => (PIN_HIGH ? p.evaluate(() => { const s = window.__wgStore; if (s && s.get().graphicsTier !== 0) { s.set({ graphicsTier: 0 }); return 1; } return 0; }) : 0);
const tierNow = (p) => p.evaluate(() => window.__wgStore?.get?.().graphicsTier ?? null);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const results = {};
const stats = (a) => {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
  return { mean: m, sd, cv: m ? sd / m : 0 };
};
async function analyse(buf) {
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  let E = 0;
  const hist = new Uint32Array(256);
  const col = new Float64Array(W);
  const row = new Float64Array(H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = data[y * W + x];
      E += v;
      hist[v]++;
      col[x] += v;
      row[y] += v;
    }
  let acc = 0;
  let peak = 0;
  const target = 0.995 * W * H;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= target) {
      peak = v;
      break;
    }
  }
  const count = (arr, n) => {
    const s = stats([...arr].map((x) => x / n));
    let c = 0;
    for (let i = 1; i < arr.length - 1; i++) {
      const v = arr[i] / n;
      if (v > s.mean + 2 * s.sd && v >= arr[i - 1] / n && v >= arr[i + 1] / n) c++;
    }
    return c;
  };
  return { E, peak, vlines: count(col, H), hlines: count(row, W) };
}
const twoFrames = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
for (const tag of ONLY) {
  const [w, h, dpr, mobile, sw, sh] = ALL[tag];
  const ctx = await b.newContext({ viewport: { width: sw || w, height: sh || h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, locale: 'pt-BR' });
  await ctx.addInitScript(() => {
    window.__WG_DEBUG__ = true;
  });
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(11000);
  if (sw) {
    await p.setViewportSize({ width: w, height: h });
    await p.waitForTimeout(1500);
  }
  const pinInfo = { enabled: PIN_HIGH, declinedBeforeMeasuring: (await tierNow(p)) === 1, repins: 0, framesOnLow: 0 };
  if (await pin(p)) await p.waitForTimeout(600);
  const env = await p.evaluate(() => {
    const post = window.__wgPost;
    const st = window.__wgStore?.get?.() ?? window.__wgStore?.getState?.();
    const gl = post?.gl;
    const db = gl ? [gl.domElement.width, gl.domElement.height] : null;
    const rt = post?.composer?.renderTarget1;
    return { tier: st?.graphicsTier ?? null, workgridState: st?.workgridState ?? null, drawingBuffer: db, renderTarget: rt ? [rt.width, rt.height] : null, rtSamples: rt?.samples ?? null, dpr: devicePixelRatio, camZ: window.__grid?.camera?.position?.z ?? null };
  });
  // region of empty cells: left third, lower middle (clear of the project tiles, toggles and the nav pill)
  const clip = { x: Math.round(Math.max(64, w * 0.05)), y: Math.round(h * 0.55), width: Math.round(w * 0.3), height: Math.round(h * 0.28) };
  const x0 = Math.round(w * 0.5);
  const y0 = Math.round(h * 0.72);
  await p.mouse.move(x0, y0);
  await p.mouse.down();
  await p.waitForTimeout(800); // press zoom settles
  const slow = [];
  for (let i = 0; i < 48; i++) {
    pinInfo.repins += await pin(p);
    await p.mouse.move(x0 + i, y0 + Math.floor(i / 2));
    await twoFrames(p);
    const buf = await p.screenshot({ clip });
    if ((await tierNow(p)) !== 0) pinInfo.framesOnLow++;
    if (i === 0 || i === 24) fs.writeFileSync(path.join(OUT, `${tag}-slow-${i}.png`), buf);
    slow.push(await analyse(buf));
  }
  await p.mouse.up();
  // fast drag then release: the inertia tail
  await p.waitForTimeout(1200);
  await p.mouse.move(x0, y0);
  await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(x0 - i * 60, y0 - i * 25);
  await p.mouse.up();
  const tail = [];
  for (let i = 0; i < 30; i++) {
    pinInfo.repins += await pin(p);
    await twoFrames(p);
    tail.push(await analyse(await p.screenshot({ clip })));
  }
  const E = slow.map((f) => f.E);
  const dE = E.slice(1).map((e, i) => Math.abs(e - E[i]));
  env.pin = pinInfo;
  const r = {
    env,
    clip,
    slow: { E_cv: +stats(E).cv.toFixed(4), dE: +(stats(dE).mean / stats(E).mean).toFixed(4), peak_cv: +stats(slow.map((f) => f.peak)).cv.toFixed(4), peak_range: [Math.min(...slow.map((f) => f.peak)), Math.max(...slow.map((f) => f.peak))], vlines: [Math.min(...slow.map((f) => f.vlines)), Math.max(...slow.map((f) => f.vlines))], hlines: [Math.min(...slow.map((f) => f.hlines)), Math.max(...slow.map((f) => f.hlines))] },
    tail: { E_cv: +stats(tail.map((f) => f.E)).cv.toFixed(4), peak_range: [Math.min(...tail.map((f) => f.peak)), Math.max(...tail.map((f) => f.peak))] },
  };
  results[tag] = r;
  console.log(tag, JSON.stringify(r));
  await ctx.close();
}
await b.close();
const prev = fs.existsSync(path.join(OUT, 'flicker.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'flicker.json'), 'utf8')) : {};
fs.writeFileSync(path.join(OUT, 'flicker.json'), JSON.stringify({ ...prev, ...results }, null, 2));
