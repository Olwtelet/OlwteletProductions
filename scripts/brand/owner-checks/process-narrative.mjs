// Processo (/about/process): the title, the lead and the steps, from 320 to 2560 px (phones and tablet in a mobile
// context, DPR 2). For each width:
//   - the text of every line of the title, the lead, and each step's title and text (word by word, grouped by line), so
//     line breaks can be read without the captures;
//   - each figure: its labels (text, right edge) against the left edge of the drawing, and the drawing's size;
//   - what ends past the window's width (text runs and boxes outside clipped areas), and the document width;
// Captures of the title block and of the steps section, with the fixed chrome hidden (header pills, sound, bottom nav).
// The page is scrolled to the end first, so every reveal (TextReveal, FadeIn, the rules) has run.
//   node scripts/brand/owner-checks/process-narrative.mjs <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  [320, 640],
  [360, 740],
  [390, 844],
  [414, 896],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
];
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const res = { build: null, sizes: {} };
const save = () => fs.writeFileSync(path.join(OUT, 'process.json'), JSON.stringify(res, null, 1));
const hideFixed = (p) =>
  p.evaluate(() => {
    for (const x of document.querySelectorAll('body *'))
      if (getComputedStyle(x).position === 'fixed') {
        x.setAttribute('data-shot-hidden', '');
        x.style.visibility = 'hidden';
      }
  });
const showFixed = (p) =>
  p.evaluate(() => {
    for (const x of document.querySelectorAll('[data-shot-hidden]')) {
      x.removeAttribute('data-shot-hidden');
      x.style.visibility = '';
    }
  });

for (const [w, h] of SIZES) {
  const mobile = w < 1024;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, locale: 'pt-BR' });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/about/process', { waitUntil: 'networkidle' });
  res.build ??= await p.evaluate(() => document.documentElement.innerHTML.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]{10,})/)?.[1] ?? null);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForSelector('[data-slice-type="about_process_steps"]', { timeout: 10000 });
  await p.waitForTimeout(1200);
  // every reveal runs on intersection: walk down the page, then back to the top
  await p.evaluate(async () => {
    const step = Math.round(innerHeight * 0.5);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 220));
    }
  });
  await p.waitForTimeout(1500);
  const m = await p.evaluate((W) => {
    const words = (el) => {
      // every word of the element, with the top of its first box: grouped into lines below
      const o = [];
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (n.parentElement.closest('.screen-reader-only')) continue;
        const t = n.textContent;
        const re = /\S+/g;
        for (let mm = re.exec(t); mm; mm = re.exec(t)) {
          const rg = document.createRange();
          rg.setStart(n, mm.index);
          rg.setEnd(n, mm.index + mm[0].length);
          const q = rg.getClientRects()[0];
          if (q) o.push({ w: mm[0], top: q.top, left: q.left, right: q.right });
        }
      }
      return o;
    };
    const lines = (el) => {
      if (!el) return null;
      const ws = words(el);
      const L = [];
      for (const x of ws) {
        const last = L.at(-1);
        if (last && Math.abs(last.top - x.top) < 6) {
          // pieces that touch (a title split letter by letter for its reveal) belong to the same word
          last.text += (x.left - last.right < 1 ? '' : ' ') + x.w;
          last.right = Math.max(last.right, x.right);
        } else L.push({ top: x.top, text: x.w, left: x.left, right: x.right });
      }
      return L.map((l) => `${l.text}  [${l.left.toFixed(0)}–${l.right.toFixed(0)}]`);
    };
    const sec = document.querySelector('[data-slice-type="about_process_steps"]');
    const titleEl = document.querySelector('[data-slice-type="about_columns"] h1') || document.querySelector('h1');
    const steps = [...sec.querySelectorAll('ol > li')].map((li) => {
      const fig = li.querySelector('figure');
      const svg = fig?.querySelector('svg');
      const sq = svg?.getBoundingClientRect();
      const labels = [...(fig?.querySelectorAll('ul li') || [])].map((x) => {
        const q = x.getBoundingClientRect();
        const rg = document.createRange();
        rg.selectNodeContents(x);
        const tq = rg.getBoundingClientRect();
        return { text: x.textContent, textRight: +tq.right.toFixed(1), cy: +(q.top + q.height / 2 - (sq ? sq.top : 0)).toFixed(1) };
      });
      return {
        number: li.querySelector('[class*="StepNumber"]')?.textContent,
        title: lines(li.querySelector('h2')),
        body: lines(li.querySelector('p')),
        diagram: svg ? { left: +sq.left.toFixed(1), width: +sq.width.toFixed(1), height: +sq.height.toFixed(1) } : null,
        labels,
        labelsClearOfDrawing: sq ? labels.every((l) => l.textRight <= sq.left + 0.5) : null,
      };
    });
    // text that ends past the configured width, outside clipped or fixed areas (what would make the page wider)
    const past = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim()) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      const q = rg.getBoundingClientRect();
      if (!q.width || q.right <= W + 0.5) continue;
      let clipped = false;
      for (let e = n.parentElement; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.position === 'fixed' || cs.overflowX !== 'visible' || cs.visibility === 'hidden' || cs.display === 'none') {
          clipped = true;
          break;
        }
      }
      if (!clipped) past.push(`${n.textContent.trim().slice(0, 30)} → ${q.right.toFixed(1)}`);
    }
    return {
      docWidth: document.documentElement.scrollWidth,
      docHeight: document.documentElement.scrollHeight,
      title: lines(titleEl),
      lead: lines(sec.querySelector('[class*="Lead"]')),
      stepCount: steps.length,
      steps,
      pastEdge: past,
    };
  }, w);
  res.sizes[`${w}x${h}`] = m;
  save();
  await hideFixed(p);
  const title = p.locator('[data-slice-type="about_columns"]').first();
  await title.screenshot({ path: path.join(OUT, `process-${w}-title.png`), animations: 'disabled' });
  const sec = p.locator('[data-slice-type="about_process_steps"]');
  await sec.screenshot({ path: path.join(OUT, `process-${w}-steps.png`), animations: 'disabled' });
  await showFixed(p);
  await ctx.close();
}
await b.close();
console.log('ok', res.build);
