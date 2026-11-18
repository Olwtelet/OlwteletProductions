// The page under the contact modal when the contact is closed right after the browser's Back (owner's round, item 5):
//   Estúdio scrolled to 1200 → "Contato" → "Política de privacidade" → Back (the modal reopens over Estúdio) → X or Esc
//   150 / 300 / 700 ms later.
// For every case, from the Back to 2.5 s after the close, one record per animation frame: scrollY, the dialog (open,
// opacity) and the URL; the close input, the native close and the URL change are timed. Times count from the history
// event itself (a popstate listener registered at document start, before the app's own), and the close is planned
// from it: "150 ms" is 150 ms after the Back, whatever the app's handling of the Back took (appHandledBackMs). What
// counts:
//   - awayAfterClose: frames from the close input on where the page is not where the visitor left it
//     (|y − y0| > 2), including frames where the modal is still opaque; as the modal fades out, the page shows through
//     it (`steps` gives the modal's opacity at each change);
//   - closeMs: close input → dialog closed (the fade; it must not grow);
//   - final: URL, dialog, html overflow (scroll released), element at the centre, focus, history pushes / backs.
// Also: Forward to a /contact entry less than 500 ms after Estúdio mounts under its own URL (`forwardSoon`), a wheel /
// swipe right after such a close (the restoration must yield to the visitor), the direct /contact, Back / Forward
// paths, the double click on X, and two filmstrips (CDP screencast running from before the Back; each tile is the last
// frame the browser presented at that moment, "sem quadro" when none had been presented yet).
//   node scripts/brand/owner-checks/modal-restore.mjs <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const sharp = require('sharp');
const BASE = 'http://localhost:3000';
const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const out = { build: null, cases: {}, interrupt: {}, paths: {}, filmstrips: {} };
const save = () => fs.writeFileSync(path.join(OUT, 'modal-restore.json'), JSON.stringify(out, null, 1));
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });

// history calls of the router (pushes to /contact, backs)
const INIT = () => {
  const w = window;
  w.__nav = [];
  // the Back / Forward itself: registered at document start, so it runs before the app's own popstate handling
  // (which remounts the page and reopens the modal synchronously); the per-frame log below starts from this time
  addEventListener('popstate', () => w.__r && w.__r.pop.push([Math.round(performance.now()), location.pathname]), true);
  const push = history.pushState;
  const back = history.back;
  history.pushState = function (s, t, u) {
    w.__nav.push(['push', String(u ?? '')]);
    return push.call(this, s, t, u);
  };
  history.back = function () {
    w.__nav.push(['back', location.pathname]);
    return back.call(this);
  };
};
// per-frame log, installed right before the Back (same document: the Back is a client navigation)
const LOGGER = () => {
  const w = window;
  const d = (w.__r = { frames: [], pop: [], popAfterApp: [], input: null });
  // long tasks (main thread busy ≥ 50 ms): [start, duration], ms of performance.now()
  d.long = [];
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) d.long.push([Math.round(e.startTime), Math.round(e.duration)]);
    }).observe({ type: 'longtask' });
  } catch {}
  // a listener added now runs after the app has handled the Back: how long that handling took
  addEventListener('popstate', () => d.popAfterApp.push([Math.round(performance.now()), location.pathname]), true);
  const mark = (e) => {
    if (d.input) return;
    if (e.type === 'keydown' && e.key !== 'Escape') return;
    if (e.type === 'pointerdown' && !e.target.closest?.('button[aria-label="Fechar contato"]')) return;
    d.input = { t: Math.round(performance.now()), how: e.type === 'keydown' ? 'Escape' : 'X', y: Math.round(scrollY) };
  };
  addEventListener('pointerdown', mark, true);
  addEventListener('keydown', mark, true);
  const f = () => {
    const dl = document.querySelector('dialog');
    d.frames.push({ t: Math.round(performance.now()), y: Math.round(scrollY), open: dl ? dl.open : null, op: dl ? +(+getComputedStyle(dl).opacity).toFixed(2) : null, path: location.pathname });
    if (!d.stop) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
};

async function page(w, h, mobile) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: 'pt-BR' });
  await ctx.addInitScript(INIT);
  const p = await ctx.newPage();
  return p;
}
const VIEW = { desktop: [1440, 900, false], mobile: [390, 844, true] };
const finalState = (p) =>
  p.evaluate(() => {
    const c = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    const a = document.activeElement;
    return {
      url: location.pathname,
      dialog: document.querySelector('dialog') ? document.querySelector('dialog').open : 'removed',
      y: Math.round(scrollY),
      htmlOverflow: document.documentElement.style.overflow,
      centre: c ? `${c.tagName.toLowerCase()}${c.closest('dialog') ? ' (dialog)' : ''}` : null,
      focus: a ? `${a.tagName.toLowerCase()}${a.getAttribute('aria-label') ? ` "${a.getAttribute('aria-label')}"` : a.textContent?.trim() ? ` "${a.textContent.trim().slice(0, 24)}"` : ''}` : null,
      pushesToContact: window.__nav.filter((n) => n[0] === 'push' && n[1].endsWith('/contact')).length,
      backs: window.__nav.filter((n) => n[0] === 'back').length,
    };
  });

/** page → scrolled to y0 → contact (nav pill) → privacy link → Back; returns once the Back is done */
async function toBack(p, url, mobile, y0 = 1200, beforeBack = null) {
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  out.build ??= await p.evaluate(() => document.documentElement.innerHTML.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]{10,})/)?.[1] ?? null);
  await p.waitForTimeout(3500);
  if (mobile) await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y0);
  else await p.mouse.wheel(0, y0);
  await p.waitForTimeout(1500);
  const y = await p.evaluate(() => Math.round(scrollY));
  const pill = p.locator('nav a', { hasText: 'Contato' }).first();
  if (mobile) await pill.tap();
  else await pill.click();
  await p.waitForTimeout(2500);
  // the X sits at the same place whenever the modal is open: clicked or tapped there, at the planned moment (a locator
  // click would first wait for the button to be stable and add its own delay)
  p.closeBox = await p.locator('button[aria-label="Fechar contato"]').boundingBox();
  const link = p.locator('dialog a[href="/privacy-policy"]:visible').first();
  if (mobile) await link.tap();
  else await link.click();
  await p.waitForTimeout(2500);
  await p.evaluate(LOGGER);
  if (beforeBack) await beforeBack();
  await p.goBack();
  return y;
}
/** wait until `ms` after the last Back / Forward to /contact (the history event, in the page's clock) */
async function untilAfterPop(p, ms) {
  const since = await p.evaluate(() => {
    const e = window.__r.pop.filter((x) => x[1] === '/contact').at(-1);
    return e ? performance.now() - e[0] : 0;
  });
  if (ms - since > 0) await p.waitForTimeout(ms - since);
}
async function close(p, how, mobile) {
  if (how === 'Escape') return p.keyboard.press('Escape');
  const q = p.closeBox;
  const x = q.x + q.width / 2;
  const y = q.y + q.height / 2;
  if (mobile) await p.touchscreen.tap(x, y);
  else await p.mouse.click(x, y);
}
function analyse(r, y0) {
  const pop = r.pop.find((x) => x[1] === '/contact')?.[0] ?? r.frames[0].t;
  const ti = r.input?.t ?? null;
  const after = ti === null ? [] : r.frames.filter((f) => f.t >= ti);
  const closed = after.find((f) => f.open !== true);
  const left = after.find((f) => f.path !== '/contact');
  const reached = r.frames.find((f) => f.t >= pop && Math.abs(f.y - y0) <= 2);
  const away = after.filter((f) => Math.abs(f.y - y0) > 2);
  return {
    y0,
    closeInputAfterBackMs: ti === null ? null : ti - pop,
    // the app's handling of the Back (remount, modal reopened) before any later listener runs
    appHandledBackMs: (r.popAfterApp || []).find((x) => x[1] === '/contact')?.[0] - pop,
    yAtCloseInput: r.input?.y ?? null,
    underReachedMsAfterBack: reached ? reached.t - pop : null,
    closeMs: closed ? closed.t - ti : null,
    urlChangeMs: left ? left.t - ti : null,
    framesAfterClose: after.length,
    awayAfterClose: away.length,
    awayValues: [...new Set(away.map((f) => f.y))],
    // each change of position after the close input: [ms after the input, scrollY, dialog open, dialog opacity]
    steps: after.filter((f, i) => i === 0 || f.y !== after[i - 1].y).map((f) => [f.t - ti, f.y, f.open, f.op]),
    // the page under the reopened modal, from the Back to the close input: [ms after the Back, scrollY]
    // long tasks from the Back on: [ms after the Back, duration]
    longTasks: (r.long || []).filter((x) => x[0] + x[1] >= pop).map((x) => [x[0] - pop, x[1]]),
    underSteps: r.frames.filter((f) => f.t >= pop && (ti === null || f.t < ti)).filter((f, i, a) => i === 0 || f.y !== a[i - 1].y).map((f) => [f.t - pop, f.y]),
  };
}

// ------------------------------------------------------------------ the matrix
const MATRIX = [
  ['desktop', 'X', 150],
  ['desktop', 'X', 300],
  ['desktop', 'X', 700],
  ['desktop', 'Escape', 150],
  ['desktop', 'Escape', 300],
  ['desktop', 'Escape', 700],
  ['mobile', 'X', 150],
  ['mobile', 'X', 300],
  ['mobile', 'X', 700],
  ['mobile', 'Escape', 150],
];
const PAGES = [['studio', '/about/studio']];
for (const [view, how, delay] of MATRIX)
  for (const [tag, url] of PAGES) {
    const [w, h, mobile] = VIEW[view];
    const p = await page(w, h, mobile);
    const y0 = await toBack(p, url, mobile);
    await untilAfterPop(p, delay);
    await close(p, how, mobile);
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ((window.__r.stop = true), window.__r));
    out.cases[`${tag}-${view}-${how === 'X' ? 'x' : 'esc'}-${delay}ms`] = { ...analyse(r, y0), final: await finalState(p) };
    save();
    await p.context().close();
  }
// the same flow over Processo and over a project page (a page without the About pages' delayed slices)
for (const [tag, url] of [
  ['process', '/about/process'],
  ['veil', '/projects/veil'],
]) {
  const p = await page(1440, 900, false);
  const y0 = await toBack(p, url, false, tag === 'veil' ? 900 : 1200);
  await untilAfterPop(p, 150);
  await close(p, 'X', false);
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => ((window.__r.stop = true), window.__r));
  out.cases[`${tag}-desktop-x-150ms`] = { ...analyse(r, y0), final: await finalState(p) };
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ the visitor scrolls right after such a close
for (const view of ['desktop', 'mobile']) {
  const [w, h, mobile] = VIEW[view];
  const p = await page(w, h, mobile);
  const y0 = await toBack(p, '/about/studio', mobile);
  await untilAfterPop(p, 150);
  await close(p, 'X', mobile);
  await p.waitForFunction(() => !document.querySelector('dialog')?.open, null, { timeout: 3000, polling: 'raf' });
  const tScroll = await p.evaluate(() => Math.round(performance.now()));
  if (mobile) {
    const cdp = await p.context().newCDPSession(p);
    const pt = (y) => [{ x: 195, y }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(640) });
    for (let y = 620; y >= 240; y -= 20) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(y) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else await p.mouse.wheel(0, 600);
  await p.waitForTimeout(1800);
  const r = await p.evaluate(() => ((window.__r.stop = true), window.__r));
  const afterScroll = r.frames.filter((f) => f.t >= tScroll);
  const peak = Math.max(...afterScroll.map((f) => f.y));
  out.interrupt[view] = {
    y0,
    gesture: mobile ? 'swipe up 400 px (CDP touch)' : 'wheel 600 px',
    msFromCloseInputToGesture: tScroll - r.input.t,
    // [ms after the gesture, scrollY] at every change
    steps: afterScroll.filter((f, i) => i === 0 || f.y !== afterScroll[i - 1].y).map((f) => [f.t - tScroll, f.y]),
    peak,
    end: afterScroll.at(-1).y,
    pulledBack: afterScroll.at(-1).y < peak - 2,
    final: await finalState(p),
  };
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ Forward soon after Estúdio mounts under its own URL
// Processo (hard load) → toggle Estúdio → 1200 → contact → Esc (Estúdio at 1200) → Back to Processo → Forward to Estúdio
// (it mounts again under its own URL, its 500 ms delay running) → `gap` ms later Forward to the /contact entry → X / Esc
// 150 ms later. Found by the round's review: before the delay also ended at that popstate, the page sat at 168 under the
// fading modal and then jumped.
out.forwardSoon = {};
for (const [view, how, gap] of [
  ['desktop', 'X', 100],
  ['desktop', 'Escape', 100],
  ['desktop', 'Escape', 250],
  ['mobile', 'X', 150],
]) {
  const [w, h, mobile] = VIEW[view];
  const p = await page(w, h, mobile);
  await p.goto(`${BASE}/about/process`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  const toggle = p.locator('a[href="/about/studio"]:visible').first();
  if (mobile) await toggle.tap();
  else await toggle.click();
  await p.waitForTimeout(3000);
  if (mobile) await p.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
  else await p.mouse.wheel(0, 1200);
  await p.waitForTimeout(1500);
  const y0 = await p.evaluate(() => Math.round(scrollY));
  const pill = p.locator('nav a', { hasText: 'Contato' }).first();
  if (mobile) await pill.tap();
  else await pill.click();
  await p.waitForTimeout(2500);
  p.closeBox = await p.locator('button[aria-label="Fechar contato"]').boundingBox();
  await p.keyboard.press('Escape');
  await p.waitForTimeout(2000);
  await p.goBack();
  await p.waitForTimeout(2000);
  await p.goForward();
  await p.waitForTimeout(gap);
  await p.evaluate(LOGGER);
  await p.goForward();
  await untilAfterPop(p, 150);
  await close(p, how, mobile);
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => ((window.__r.stop = true), window.__r));
  out.forwardSoon[`${view}-${how === 'X' ? 'x' : 'esc'}-gap${gap}ms`] = { ...analyse(r, y0), final: await finalState(p) };
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ other paths (desktop)
// direct /contact + X → /
{
  const p = await page(1440, 900, false);
  await p.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.locator('button[aria-label="Fechar contato"]').click();
  await p.waitForTimeout(2000);
  out.paths.directContactX = await finalState(p);
  save();
  await p.context().close();
}
// open over Estúdio at 900 → X (no history traversal): same place
{
  const p = await page(1440, 900, false);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await p.mouse.wheel(0, 900);
  await p.waitForTimeout(1500);
  const y0 = await p.evaluate(() => Math.round(scrollY));
  await p.locator('nav a', { hasText: 'Contato' }).first().click();
  await p.waitForTimeout(2500);
  await p.evaluate(LOGGER);
  await p.locator('button[aria-label="Fechar contato"]').click();
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => ((window.__r.stop = true), window.__r));
  const a = analyse(r, y0);
  out.paths.openThenX = { y0, closeMs: a.closeMs, awayAfterClose: a.awayAfterClose, final: await finalState(p) };
  save();
  await p.context().close();
}
// two /contact entries: Estúdio 1200 → contact → privacy → contact → Back → Back → X
{
  const p = await page(1440, 900, false);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await p.mouse.wheel(0, 1200);
  await p.waitForTimeout(1500);
  const y0 = await p.evaluate(() => Math.round(scrollY));
  await p.locator('nav a', { hasText: 'Contato' }).first().click();
  await p.waitForTimeout(2500);
  await p.locator('dialog a[href="/privacy-policy"]:visible').first().click();
  await p.waitForTimeout(2500);
  await p.locator('nav a', { hasText: 'Contato' }).first().click();
  await p.waitForTimeout(2500);
  await p.goBack();
  await p.waitForTimeout(2000);
  await p.evaluate(LOGGER);
  await p.goBack();
  await p.waitForTimeout(2500);
  const yUnder = await p.evaluate(() => Math.round(scrollY));
  await p.locator('button[aria-label="Fechar contato"]').click();
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => ((window.__r.stop = true), window.__r));
  const a = analyse(r, y0);
  out.paths.twoContactEntries = { y0, yUnder, awayAfterClose: a.awayAfterClose, steps: a.steps, final: await finalState(p) };
  save();
  await p.context().close();
}
// Back → scroll → Forward to /contact → X: the page stays where it is seen under the modal
{
  const p = await page(1440, 900, false);
  const y0 = await toBack(p, '/about/studio', false);
  await p.waitForTimeout(2000);
  await p.goBack();
  await p.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) await p.mouse.wheel(0, -200);
  await p.waitForTimeout(1500);
  const yScrolled = await p.evaluate(() => Math.round(scrollY));
  await p.goForward();
  await p.waitForTimeout(2500);
  const yUnder = await p.evaluate(() => Math.round(scrollY));
  await p.evaluate(() => (window.__r.input = null));
  await p.locator('button[aria-label="Fechar contato"]').click();
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => ((window.__r.stop = true), window.__r));
  const a = analyse(r, yUnder);
  out.paths.forwardThenClose = { y0, yScrolled, yUnder, awayAfterClose: a.awayAfterClose, steps: a.steps, final: await finalState(p) };
  save();
  await p.context().close();
}
// double click on X (600 ms after the first click): one navigation, contact not reopened
{
  const p = await page(1440, 900, false);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await p.locator('nav a', { hasText: 'Contato' }).first().click();
  await p.waitForTimeout(2500);
  const box = await p.locator('button[aria-label="Fechar contato"]').boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await p.mouse.click(x, y);
  await p.waitForTimeout(600);
  await p.mouse.dblclick(x, y);
  await p.waitForTimeout(2000);
  out.paths.doubleClickX = await finalState(p);
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ filmstrips (CDP screencast from the Back on)
for (const [view, how, delay] of [
  ['desktop', 'X', 150],
  ['mobile', 'X', 150],
]) {
  const [w, h, mobile] = VIEW[view];
  const p = await page(w, h, mobile);
  const cdp = await p.context().newCDPSession(p);
  const frames = [];
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ ts: f.metadata.timestamp * 1000, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  const y0 = await toBack(p, '/about/studio', mobile, 1200, async () => {
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: w, maxHeight: h, everyNthFrame: 1 });
    await p.waitForTimeout(400);
  });
  await untilAfterPop(p, delay);
  await close(p, how, mobile);
  await p.waitForTimeout(2000);
  await cdp.send('Page.stopScreencast');
  const r = await p.evaluate(() => ((window.__r.stop = true), { ...window.__r, origin: performance.timeOrigin }));
  const tIn = r.origin + r.input.t;
  const marks = [-100, 0, 100, 200, 300, 400, 500, 700, 1000, 1500];
  const pick = marks.map((ms) => {
    const at = tIn + ms;
    const fr = frames.filter((f) => f.ts <= at).at(-1) ?? null;
    const lf = r.frames.filter((f) => r.origin + f.t <= at).at(-1);
    return { ms, frame: fr, y: lf?.y ?? null, op: lf?.op ?? null, open: lf?.open ?? null };
  });
  const tw = mobile ? 180 : 320;
  const th = Math.round((tw * h) / w);
  const tiles = [];
  for (const [i, k] of pick.entries()) {
    const img = k.frame
      ? await sharp(Buffer.from(k.frame.data, 'base64')).resize(tw, th).toBuffer()
      : await sharp(Buffer.from(`<svg width="${tw}" height="${th}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#333"/><text x="8" y="20" font-family="Consolas, monospace" font-size="12" fill="#ccc">sem quadro</text></svg>`)).png().toBuffer();
    // the image is the frame the browser presented at that moment (screencast); the page's own state at the same moment
    // (scrollY, modal) is in the JSON, since presentation can lag behind it
    const label = `${k.ms >= 0 ? '+' : ''}${k.ms} ms after ${how === 'X' ? 'X' : 'Esc'}`;
    const svg = `<svg width="${tw}" height="22" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><text x="6" y="15" font-family="Consolas, monospace" font-size="12" fill="#eee">${label}</text></svg>`;
    tiles.push({ input: img, top: 22, left: i * (tw + 6) }, { input: Buffer.from(svg), top: 0, left: i * (tw + 6) });
  }
  const file = `filmstrip-${view}-${how === 'X' ? 'x' : 'esc'}-${delay}ms.jpg`;
  await sharp({ create: { width: pick.length * (tw + 6) - 6, height: th + 22, channels: 3, background: '#111' } })
    .composite(tiles)
    .jpeg({ quality: 85 })
    .toFile(path.join(OUT, file));
  out.filmstrips[`${view}-${how === 'X' ? 'x' : 'esc'}-${delay}ms`] = { file, y0, closeInputAfterBackMs: r.input.t - (r.pop.find((x) => x[1] === '/contact')?.[0] ?? 0), frames: frames.length, tiles: pick.map((k) => ({ ms: k.ms, presented: !!k.frame, y: k.y, modalOpen: k.open, modalOpacity: k.op })) };
  save();
  await p.context().close();
}
await b.close();
console.log('ok', out.build);
