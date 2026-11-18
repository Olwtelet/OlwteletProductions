// How long the contact modal takes to reappear on screen after Back (owner's second round, item 2): the cost of
// rendering the About page's slices at the Back itself (Delay, immediateUnderContact) instead of 500 ms later.
//   Estúdio (or Processo / Veil) at 1200 → "Contato" → "Política de privacidade" → Back.
// Same build, two ways: `immediate` (as served) and `delayed`, where the position kept in the /contact history entry
// is removed before the privacy link, so the remounted page takes the 500 ms delay as before this round (and is not
// put back in place: only the time to the first new frame is compared).
// For each run: the history event (popstate listener registered at document start), the app's long tasks from it, and
// the first frame the browser presents after it that differs from the privacy page (CDP screencast running from before
// the Back; frame times are the browser's own swap times). Nothing is clicked after the Back.
//   node scripts/brand/owner-checks/modal-reappear.mjs <outDir> [runs]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const sharp = require('sharp');
const BASE = 'http://localhost:3000';
const OUT = path.resolve(process.argv[2]);
const RUNS = +(process.argv[3] || 4);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const out = { build: null, runs: {} };
const save = () => fs.writeFileSync(path.join(OUT, 'modal-reappear.json'), JSON.stringify(out, null, 1));
const INIT = () => {
  window.__pop = [];
  addEventListener('popstate', () => window.__pop.push(performance.now()), true);
  window.__long = [];
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__long.push([e.startTime, e.duration]);
    }).observe({ type: 'longtask' });
  } catch {}
};
/** mean absolute difference of two JPEG frames, on a 64 × 40 greyscale thumbnail (0–255) */
async function diff(a, b2) {
  const t = (d) => sharp(Buffer.from(d, 'base64')).resize(64, 40, { fit: 'fill' }).greyscale().raw().toBuffer();
  const [x, y] = await Promise.all([t(a), t(b2)]);
  let s = 0;
  for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]);
  return s / x.length;
}
for (const [view, w, h, mobile] of [
  ['desktop', 1440, 900, false],
  ['mobile', 390, 844, true],
])
  for (const [tag, url] of [
    ['studio', '/about/studio'],
    ['process', '/about/process'],
  ])
    for (const mode of ['immediate', 'delayed'])
      for (let run = 0; run < RUNS; run++) {
        const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: 'pt-BR' });
        await ctx.addInitScript(INIT);
        const p = await ctx.newPage();
        await p.goto(BASE + url, { waitUntil: 'networkidle' });
        out.build ??= await p.evaluate(() => document.documentElement.innerHTML.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]{10,})/)?.[1] ?? null);
        await p.waitForTimeout(3500);
        await p.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
        await p.waitForTimeout(1500);
        const pill = p.locator('nav a', { hasText: 'Contato' }).first();
        if (mobile) await pill.tap();
        else await pill.click();
        await p.waitForTimeout(2500);
        if (mode === 'delayed')
          await p.evaluate(() => {
            const st = { ...(history.state ?? {}) };
            delete st.olwContactUnder;
            history.replaceState(st, '');
          });
        const link = p.locator('dialog a[href="/privacy-policy"]:visible').first();
        if (mobile) await link.tap();
        else await link.click();
        await p.waitForTimeout(2500);
        const cdp = await ctx.newCDPSession(p);
        const frames = [];
        cdp.on('Page.screencastFrame', (f) => {
          frames.push({ ts: f.metadata.timestamp * 1000, data: f.data });
          cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
        });
        await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, maxWidth: w, maxHeight: h, everyNthFrame: 1 });
        await p.waitForTimeout(500);
        await p.goBack();
        await p.waitForTimeout(1500);
        await cdp.send('Page.stopScreencast');
        const r = await p.evaluate(() => ({ pop: window.__pop.at(-1), origin: performance.timeOrigin, long: window.__long, y: Math.round(scrollY), open: !!document.querySelector('dialog')?.open }));
        const ev = r.origin + r.pop;
        const before = frames.filter((f) => f.ts <= ev).at(-1) ?? frames[0];
        let first = null;
        for (const f of frames.filter((f) => f.ts > ev)) {
          if ((await diff(before.data, f.data)) > 4) {
            first = f;
            break;
          }
        }
        const key = `${tag}-${view}-${mode}`;
        (out.runs[key] ??= []).push({
          firstNewFrameMs: first ? Math.round(first.ts - ev) : null,
          longTasks: r.long.filter(([s, d]) => s + d >= r.pop).map(([s, d]) => [Math.round(s - r.pop), Math.round(d)]),
          framesAfter: frames.filter((f) => f.ts > ev).length,
          modalOpen: r.open,
          y: r.y,
        });
        save();
        await ctx.close();
      }
const med = (a) => {
  const v = a.filter((x) => x != null).sort((x, y) => x - y);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
};
out.summary = Object.fromEntries(Object.entries(out.runs).map(([k, v]) => [k, { firstNewFrameMs: v.map((x) => x.firstNewFrameMs), median: med(v.map((x) => x.firstNewFrameMs)) }]));
save();
await b.close();
console.log(JSON.stringify(out.summary));
