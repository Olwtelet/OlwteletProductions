// Footer and Estúdio's "where we are" block (address + contacts) from 300 to 2560 px, for the 320 px fixes:
// - footer: the line boxes of the two text blocks and the smallest gap between lines that share a row
//   (minGapSameRow < 0 = the e-mail runs over "Brasília, DF");
// - Estúdio: the contact column and its address lines; the document width (scrollWidth) against the window, and the
//   text that ends past the screen edge (pastEdge), on every page;
// - copying the footer e-mail: the selected text of its link (it must be the address on one line at every width).
// Captures of each block. The fixed chrome (header pills, sound button, bottom nav) is hidden during the element
// captures and the footer's random centre image is masked, so two runs can be compared pixel by pixel.
//   node narrow-widths.mjs <outDir> [--block-external]
// --block-external: every request outside localhost fails, as when the Adobe Fonts kit (ballinger-mono, the font of
// Estúdio's contact list) does not load; the fallback font then sets the widths.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const OUT = path.resolve(process.argv[2]);
const BLOCK = process.argv.includes('--block-external');
fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [300, 320, 340, 350, 360, 375, 390, 414, 600, 768, 1024, 1280, 1440, 1920, 2560];
// the footer is on the About pages and on the privacy policy
const PAGES = [
  ['studio', '/about/studio'],
  ['process', '/about/process'],
  ['privacy', '/privacy-policy'],
];
const hideFixed = (loc) =>
  loc.evaluate((el) => {
    for (const x of document.querySelectorAll('body *'))
      if (getComputedStyle(x).position === 'fixed' && !x.contains(el)) {
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
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const res = { build: null, blockExternal: BLOCK, shots: {} };
for (const [tag, url] of PAGES) {
  for (const w of WIDTHS) {
    if (tag !== 'studio' && ![300, 320, 340, 360, 390, 768, 1440].includes(w)) continue;
    const mobile = w < 1024;
    const ctx = await b.newContext({ viewport: { width: w, height: mobile ? 740 : Math.round(w * 0.625) }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
    if (BLOCK) await ctx.route(/^https?:\/\/(?!localhost[:/])/, (r) => r.abort());
    const p = await ctx.newPage();
    await p.goto('http://localhost:3000' + url, { waitUntil: 'networkidle' });
    res.build ??= await p.evaluate(() => document.documentElement.innerHTML.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]{10,})/)?.[1] ?? null);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(800);
    const m = {
      scrollWidth: await p.evaluate(() => document.documentElement.scrollWidth),
      innerWidth: await p.evaluate(() => innerWidth),
      monoFontLoaded: await p.evaluate(() => [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'ballinger-mono' && f.status === 'loaded')),
      // what ends past the window's width (the configured one: in a phone context the layout viewport, innerWidth and
      // clientWidth grow with the page), anywhere on the page: what makes the page wider than the window
      pastEdge: await p.evaluate((W) => {
        const cw = W;
        // elements that end past the screen and are not inside a clipping/scrolling ancestor (body excluded: it clips
        // x on purpose); a clipping box that itself crosses the edge counts, its contents do not
        const over = new Set();
        for (const el of document.body.querySelectorAll('*')) {
          const q = el.getBoundingClientRect();
          if (!q.width || q.right <= cw + 0.5 || getComputedStyle(el).position === 'fixed') continue;
          let clipped = false;
          for (let e = el.parentElement; e && e !== document.body; e = e.parentElement)
            if (getComputedStyle(e).overflowX !== 'visible' || getComputedStyle(e).position === 'fixed') {
              clipped = true;
              break;
            }
          if (!clipped) over.add(el);
        }
        // the innermost ones: the culprits rather than the containers they widen
        const boxes = [...over]
          .filter((el) => ![...over].some((o) => o !== el && el.contains(o)))
          .map((el) => {
            const q = el.getBoundingClientRect();
            return { el: `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className ?? '').slice(0, 50)}`, text: (el.textContent || '').trim().slice(0, 40), left: +q.left.toFixed(1), right: +q.right.toFixed(1), fontSize: getComputedStyle(el).fontSize };
          });
        // text that overflows its own box (the box ends inside the window, its line does not)
        const lines = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          if (!n.textContent.trim()) continue;
          const rg = document.createRange();
          rg.selectNodeContents(n);
          for (const q of rg.getClientRects()) {
            if (!q.width || q.right <= cw + 0.5) continue;
            let clipped = false;
            for (let e = n.parentElement; e && e !== document.body; e = e.parentElement)
              if (getComputedStyle(e).overflowX !== 'visible' || getComputedStyle(e).position === 'fixed') {
                clipped = true;
                break;
              }
            if (!clipped) {
              const pe = n.parentElement;
              lines.push({ el: `${pe.tagName.toLowerCase()}.${String(pe.className?.baseVal ?? pe.className ?? '').slice(0, 50)}`, text: n.textContent.trim().slice(0, 40), left: +q.left.toFixed(1), right: +q.right.toFixed(1), boxRight: +pe.getBoundingClientRect().right.toFixed(1), fontSize: getComputedStyle(pe).fontSize });
            }
          }
        }
        return [...boxes, ...lines].slice(0, 10);
      }, w),
    };
    const where = p.locator('section[data-slice-type="about_where_we_are"]');
    if (await where.count()) {
      await where.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 40, behavior: 'instant' }));
      await p.waitForTimeout(900);
      await where.evaluate((el) => Promise.all([...el.querySelectorAll('img')].map((i) => i.complete || new Promise((r) => (i.onload = i.onerror = r)))));
      m.where = await where.evaluate((el) => {
        const c = el.querySelector('[class*="Contact"]');
        const lines = [];
        const walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const rg = document.createRange();
          rg.selectNodeContents(n);
          for (const q of rg.getClientRects()) lines.push(`${n.textContent} [${q.left.toFixed(1)}–${q.right.toFixed(1)}]`);
        }
        const q = c.getBoundingClientRect();
        return { contactBox: [+q.left.toFixed(1), +q.right.toFixed(1)], lines };
      });
      await hideFixed(where);
      await where.screenshot({ path: path.join(OUT, `${tag}-where-${w}.png`), animations: 'disabled' });
      await showFixed(p);
    }
    await p.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await p.waitForTimeout(1200);
    m.footer = await p.evaluate(() => {
      const f = document.querySelector('footer');
      const top = f.getBoundingClientRect().top;
      const lines = (el) => {
        const o = [];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          if (!n.textContent.trim()) continue;
          const rg = document.createRange();
          rg.selectNodeContents(n);
          for (const q of rg.getClientRects()) o.push({ text: n.textContent.trim(), l: +q.left.toFixed(1), r: +q.right.toFixed(1), t: +(q.top - top).toFixed(1), b: +(q.bottom - top).toFixed(1) });
        }
        return o;
      };
      const ps = [...f.querySelectorAll('[class*="FooterText"] p')];
      const L = lines(ps[0]);
      const R = lines(ps[1]);
      let minGap = null;
      for (const a of L)
        for (const c of R) {
          if (Math.min(a.b, c.b) - Math.max(a.t, c.t) < 6) continue; // same row (adjacent rows touch by ~1 px)
          const g = +(c.l - a.r).toFixed(1);
          if (minGap === null || g < minGap) minGap = g;
        }
      // what a reader copies: select the whole e-mail link and read the selection
      const mail = f.querySelector('a[href^="mailto:"]');
      const sel = getSelection();
      sel.removeAllRanges();
      const rg = document.createRange();
      rg.selectNodeContents(mail);
      sel.addRange(rg);
      const copied = sel.toString();
      sel.removeAllRanges();
      return { left: L, right: R, minGapSameRow: minGap, emailCopied: copied };
    });
    await hideFixed(p.locator('footer'));
    await p.locator('footer').screenshot({ path: path.join(OUT, `${tag}-footer-${w}.png`), animations: 'disabled', mask: [p.locator('footer [class*="MainImage"]')] });
    res.shots[`${tag}-${w}`] = m;
    console.log(`${tag} ${w}: page ${m.scrollWidth}/${m.innerWidth} px, footer gap ${m.footer.minGapSameRow}, copied ${JSON.stringify(m.footer.emailCopied)}, past edge ${m.pastEdge.map((x) => x.text + "@" + x.right).join(" | ") || "none"}, ballinger-mono ${m.monoFontLoaded ? "loaded" : "not loaded"}`);
    await ctx.close();
  }
}
fs.writeFileSync(path.join(OUT, 'narrow.json'), JSON.stringify(res, null, 2));
await b.close();
