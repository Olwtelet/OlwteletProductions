// Checks of the fixes made after the independent review of the owner's round (local server, GET only, normal settings).
//   node scripts/brand/owner-checks/review-fixes.mjs <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const out = {};
const save = () => fs.writeFileSync(path.join(OUT, 'review-fixes.json'), JSON.stringify(out, null, 2));
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const AUDIO = () => {
  const w = window;
  w.__a = { ctx: 0, loops: new Set(), filters: [] };
  const AC = w.AudioContext;
  w.AudioContext = class extends AC {
    constructor(...x) {
      super(...x);
      w.__a.ctx++;
      w.__a.last = this;
    }
  };
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...x) {
    if (this.buffer && this.buffer.duration >= 20) {
      w.__a.loops.add(this);
      this.addEventListener('ended', () => w.__a.loops.delete(this));
    }
    return start.apply(this, x);
  };
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d, ...r) {
    if (this instanceof AudioBufferSourceNode && d instanceof BiquadFilterNode && this.buffer?.duration >= 20) w.__a.loopFilter = d;
    if (d instanceof AudioDestinationNode && !w.__a.an) {
      const an = this.context.createAnalyser();
      connect.call(this, an);
      w.__a.an = an;
    }
    return connect.call(this, d, ...r);
  };
  w.__a.rms = () => {
    const an = w.__a.an;
    if (!an) return 0;
    const d = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(d);
    return Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length);
  };
};
const audio = async (p) => {
  let rms = 0;
  for (let i = 0; i < 6; i++) {
    rms = Math.max(rms, await p.evaluate(() => window.__a.rms()));
    await p.waitForTimeout(100);
  }
  return p.evaluate((r) => {
    let pref = null;
    try {
      pref = localStorage.getItem('olwtelet:sound');
    } catch {}
    const el = document.querySelector('[class*="Sound"][role="button"]');
    return { ctx: window.__a.ctx, state: window.__a.last?.state, loops: window.__a.loops.size, rms: +r.toFixed(3), label: el?.textContent.trim(), name: el?.getAttribute('aria-label'), pressed: el?.getAttribute('aria-pressed'), pref, lowpass: window.__a.loopFilter ? Math.round(window.__a.loopFilter.frequency.value) : null, url: location.pathname };
  }, rms);
};
async function page(w, h, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dpr || 1, isMobile: !!opts.mobile, hasTouch: !!opts.mobile, locale: 'pt-BR' });
  await ctx.addInitScript(AUDIO);
  return ctx.newPage();
}

// 0 + 1: title accent gap and CTA clearance over the nav pill
out.title = {};
for (const w of [390, 1440, 2560]) {
  const p = await page(w, w < 768 ? 844 : 900, { mobile: w < 768 });
  await p.goto(`${BASE}/projects/filmes-hd-online-gratis`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  out.title[w] = await p.evaluate(() => {
    const lines = [...document.querySelectorAll('h1 .split-line')];
    const i = lines.findIndex((l) => /Á/i.test(l.textContent));
    if (i < 1) return { lines: lines.length, note: 'accent on the first line' };
    // the Á's top (canvas metrics of the loaded font) vs the bottom of the previous line's glyph box
    const r = document.createRange();
    r.selectNodeContents(lines[i]);
    const cur = r.getBoundingClientRect();
    r.selectNodeContents(lines[i - 1]);
    const prev = r.getBoundingClientRect();
    const cs = getComputedStyle(lines[i]);
    const c = document.createElement('canvas').getContext('2d');
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const mA = c.measureText('Á');
    const base = cur.top + (cur.height + mA.fontBoundingBoxAscent - mA.fontBoundingBoxDescent) / 2; // approx. baseline
    const accentTop = base - mA.actualBoundingBoxAscent;
    const prevBase = prev.top + (prev.height + mA.fontBoundingBoxAscent - mA.fontBoundingBoxDescent) / 2;
    return { fontSize: cs.fontSize, gapPx: +(accentTop - prevBase).toFixed(2), class: document.querySelector('h1').className.includes('Accented') };
  });
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(1500);
  out.title[w].ctaToNav = await p.evaluate(() => {
    const a = document.querySelector('[class*="SimilarProjectsAllWorkCta"] span');
    const r = document.createRange();
    r.selectNodeContents(a);
    const g = r.getBoundingClientRect();
    const nav = document.querySelector('nav ul')?.getBoundingClientRect();
    return nav ? Math.round(nav.top - g.bottom) : null;
  });
  await p.screenshot({ path: path.join(OUT, `title-cta-${w}.png`) });
  await p.context().close();
}
save();

// 2, 4, 13: the sound control's first press while blocked; aria; low-pass when the loop starts on /contact
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  const before = await audio(p);
  await p.locator('[class*="Sound"][role="button"]').click();
  await p.waitForTimeout(2500);
  const afterFirst = await audio(p);
  await p.locator('[class*="Sound"][role="button"]').click();
  await p.waitForTimeout(1200);
  const afterSecond = await audio(p);
  out.soundControl = { before, afterFirst, afterSecond };
  await p.context().close();
  // a first activation that is the header CTA: the loop starts on /contact and must be low-passed
  const q = await page(1440, 900);
  await q.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await q.waitForTimeout(3000);
  await q.locator('header a', { hasText: /conversar/i }).first().click();
  await q.waitForTimeout(4000);
  out.lowpassOnContact = await audio(q);
  await q.context().close();
}
save();

// 3: OFF right after a navigation whose loop is still decoding: no loop may attach afterwards
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.mouse.click(700, 450);
  await p.waitForTimeout(2500);
  await p.locator('nav a', { hasText: 'Projetos' }).first().click();
  await p.waitForTimeout(150);
  await p.locator('[class*="Sound"][role="button"]').click().catch(() => {});
  await p.waitForTimeout(5000);
  out.lateLoop = await audio(p);
  await p.context().close();
}
save();

// 5, 6, 7: Processo CTA contrast, step numbers, figures aligned; Estúdio CTA unchanged
out.process = {};
for (const [w, h] of [
  [390, 844],
  [1440, 900],
]) {
  const p = await page(w, h, { mobile: w < 768 });
  await p.goto(`${BASE}/about/process`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  out.process[w] = await p.evaluate(() => {
    const cta = document.querySelector('a[class*="About_View"]');
    const cs = cta && getComputedStyle(cta);
    const figs = [...document.querySelectorAll('[class*="StepFigure"] svg')].map((s) => {
      const r = s.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.width)];
    });
    return { ctaColor: cs?.color, ctaBg: cs?.backgroundColor, numberColor: getComputedStyle(document.querySelector('[class*="StepNumber"]')).color, figures: figs };
  });
  await p.context().close();
}
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  out.studioCta = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('a[class*="About_View"]'));
    return { color: cs.color, bg: cs.backgroundColor };
  });
  await p.context().close();
}
save();

// 9, 10: contact tiles on touch, arrow shape in the row cards
{
  const p = await page(390, 844, { mobile: true });
  await p.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  const tile = p.locator('[class*="TileContact"][aria-label^="Abrir o LinkedIn"]').first();
  const box = await tile.boundingBox();
  await p.touchscreen.tap(box.x + 10, box.y + 10).catch(() => {});
  await p.waitForTimeout(800);
  out.tileAfterTap = await tile.evaluate((e) => getComputedStyle(e).backgroundColor);
  await p.context().close();
  const q = await page(1024, 768);
  await q.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await q.waitForTimeout(3000);
  out.arrows1024 = await q.evaluate(() => [...document.querySelectorAll('[class*="ArrowButtonContainer"]')].map((e) => [Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
  out.linkedinIcon = await q.evaluate(() => !!document.querySelector('[aria-label="Abrir o LinkedIn"] svg'));
  await q.context().close();
}
save();

// 12, 14, 15: keyboard opener on home; focus back to the nav pill; privacy → Back → X keeps the scroll
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(10500);
  await p.locator('header a', { hasText: /conversar/i }).first().focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(4000);
  out.keyboardOpenerHome = await p.evaluate(() => ({ url: location.pathname, open: document.querySelector('dialog')?.open ?? null }));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(2500);
  out.keyboardOpenerHome.afterEscape = await p.evaluate(() => ({ url: location.pathname, focused: document.activeElement?.textContent?.trim().slice(0, 20) }));
  await p.context().close();
}
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.locator('nav a', { hasText: 'Contato' }).first().focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(2500);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(3000);
  out.focusAfterNavOpener = await p.evaluate(() => ({ url: location.pathname, focused: document.activeElement ? `${document.activeElement.tagName} ${document.activeElement.getAttribute('href') || ''} ${document.activeElement.textContent.trim().slice(0, 12)}` : null }));
  // privacy → Back → X: scroll of the page underneath
  await p.mouse.wheel(0, 1100);
  await p.waitForTimeout(1500);
  const y0 = await p.evaluate(() => scrollY);
  await p.locator('nav a', { hasText: 'Contato' }).first().click();
  await p.waitForTimeout(2500);
  await p.locator('dialog a[href="/privacy-policy"]:visible').first().click();
  await p.waitForTimeout(2500);
  await p.goBack();
  await p.waitForTimeout(2500);
  const yUnder = await p.evaluate(() => scrollY);
  await p.locator('button[aria-label="Fechar contato"]').click();
  const samples = [];
  for (let i = 0; i < 12; i++) {
    samples.push(await p.evaluate(() => Math.round(scrollY)));
    await p.waitForTimeout(150);
  }
  out.privacyBackClose = { y0, yUnderModal: yUnder, afterClose: samples, url: await p.evaluate(() => location.pathname) };
  await p.context().close();
}
save();
await b.close();
console.log(JSON.stringify(out, null, 1));
