// Checks of the fixes made after the final independent review of the owner's round (local server, GET only, normal
// browser settings; the slow network of the sound case is DevTools network emulation, not a browser setting).
//   node scripts/brand/owner-checks/review2-fixes.mjs <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const out = {};
const save = () => fs.writeFileSync(path.join(OUT, 'review2-fixes.json'), JSON.stringify(out, null, 2));
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });

// audio: contexts, long loops (with their length, to tell the route loops apart) and the real output level (RMS);
// navigation: every history push / replace / back
const INIT = () => {
  const w = window;
  w.__a = { ctx: 0, loops: [] };
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
      const rec = { len: +this.buffer.duration.toFixed(1), at: Math.round(performance.now()), ended: null };
      w.__a.loops.push(rec);
      this.addEventListener('ended', () => (rec.ended = Math.round(performance.now())));
    }
    return start.apply(this, x);
  };
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d, ...r) {
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
  w.__nav = [];
  const push = history.pushState;
  const replace = history.replaceState;
  const back = history.back;
  history.pushState = function (s, t, u) {
    w.__nav.push(['push', String(u ?? '')]);
    return push.call(this, s, t, u);
  };
  history.replaceState = function (s, t, u) {
    if (u) w.__nav.push(['replace', String(u)]);
    return replace.call(this, s, t, u);
  };
  history.back = function () {
    w.__nav.push(['back', location.pathname]);
    return back.call(this);
  };
};
async function page(w, h, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dpr || 1, isMobile: !!opts.mobile, hasTouch: !!opts.mobile, locale: 'pt-BR' });
  await ctx.addInitScript(INIT);
  return ctx.newPage();
}
const soundState = (p) =>
  p.evaluate(() => {
    const el = document.querySelector('[class*="Sound"][role="button"]');
    const active = window.__a.loops.filter((l) => l.ended === null).map((l) => l.len);
    return { t: Math.round(performance.now()), url: location.pathname, ctx: window.__a.ctx, state: window.__a.last?.state, active, rms: +window.__a.rms().toFixed(3), label: el?.textContent.trim(), pressed: el?.getAttribute('aria-pressed'), iconOn: el ? [...el.querySelectorAll('circle')].filter((c) => c.getAttribute('opacity') === '1').length : null };
  });
const sample = async (p, ms, every = 500) => {
  const s = [];
  for (let t = 0; t <= ms; t += every) {
    let r = 0;
    for (let i = 0; i < 3; i++) r = Math.max(r, await p.evaluate(() => window.__a.rms()));
    s.push({ ...(await soundState(p)), rms: +r.toFixed(3) });
    await p.waitForTimeout(every);
  }
  return s;
};
const LOOPS = { 60.1: 'grid', 59.1: 'other', 52.9: 'project' };
const name = (len) => LOOPS[len] || String(len);
const resource = (p, part) => p.evaluate((x) => performance.getEntriesByType('resource').filter((e) => e.name.includes(x)).map((e) => Math.round(e.responseEnd)), part);

// ------------------------------------------------------------------ sound 1: navigation while a loop is still loading
// /about/process → key (unlock) → slow network → "Projetos" → "Sobre" 1.2 s later. The About loop must take over on
// /about/studio; before the fix the home loop kept playing there until the team canvas texture had loaded.
for (const variant of ['navigate', 'navigate+offon']) {
  const p = await page(1440, 900);
  await p.goto(`${BASE}/about/process`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(2500);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 200 * 1024, uploadThroughput: 200 * 1024 });
  const t0 = await p.evaluate(() => performance.now());
  await p.locator('nav a', { hasText: 'Projetos' }).first().click();
  await p.waitForTimeout(1200);
  await p.locator('nav a', { hasText: 'Sobre' }).first().click();
  let offon = null;
  if (variant === 'navigate+offon') {
    await p.waitForTimeout(3500);
    const sound = p.locator('[class*="Sound"][role="button"]');
    await sound.click();
    await p.waitForTimeout(600);
    await sound.click();
    offon = await p.evaluate(() => Math.round(performance.now()));
  }
  const s = await sample(p, 14000);
  const r = {
    t0: Math.round(t0),
    offonAt: offon,
    particleJpgEnd: await resource(p, 'particle.jpg'),
    otherMp3End: await resource(p, 'other'),
    loops: (await p.evaluate(() => window.__a.loops)).map((l) => ({ ...l, name: name(l.len) })),
    onStudio: s.filter((x) => x.url === '/about/studio').map((x) => ({ t: x.t, active: x.active.map(name), rms: x.rms, label: x.label, iconOn: x.iconOn })),
    contexts: s.at(-1).ctx,
  };
  // home loop heard on the About page (it must not be, beyond its 0.2 s fade-out)
  r.gridOnStudioSamples = r.onStudio.filter((x) => x.active.includes('grid') && x.rms > 0.01).length;
  r.final = s.at(-1);
  out[`sound-slow-${variant}`] = r;
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ sound 2: pages outside the route list
for (const url of ['/privacy-policy', '/pagina-que-nao-existe']) {
  const p = await page(1440, 900);
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(4000);
  const before = await soundState(p);
  await p.mouse.click(700, 500);
  const s = await sample(p, 4000);
  out[`sound-direct-${url}`] = { before, after: s.at(-1), maxRms: Math.max(...s.map((x) => x.rms)), loops: (await p.evaluate(() => window.__a.loops)).map((l) => name(l.len)) };
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ sound 3: holding Space on the toggle
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.mouse.click(700, 450); // unlock first, so the press is a plain toggle
  await p.waitForTimeout(2000);
  await p.locator('[class*="Sound"][role="button"]').focus();
  const cdp = await p.context().newCDPSession(p);
  const key = { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32, text: ' ' };
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...key });
  for (let i = 0; i < 6; i++) {
    await p.waitForTimeout(40);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', autoRepeat: true, ...key });
  }
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
  await p.waitForTimeout(1200);
  out['sound-space-held'] = { ...(await soundState(p)), pref: await p.evaluate(() => localStorage.getItem('olwtelet:sound')) };
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ modal helpers
const ys = (p, ms) =>
  p.evaluate(
    (d) =>
      new Promise((res) => {
        const v = [];
        const end = performance.now() + d;
        const f = () => {
          v.push(Math.round(scrollY));
          if (performance.now() < end) requestAnimationFrame(f);
          else res(v);
        };
        f();
      }),
    ms,
  );
const summary = (v) => ({ first: v[0], last: v.at(-1), distinct: new Set(v).size });
const modalState = (p) =>
  p.evaluate(() => ({
    url: location.pathname,
    open: document.querySelector('dialog')?.open ?? null,
    y: Math.round(scrollY),
    pushesToContact: window.__nav.filter((n) => n[0] === 'push' && n[1].endsWith('/contact')).length,
    backs: window.__nav.filter((n) => n[0] === 'back').length,
    htmlOverflow: document.documentElement.style.overflow,
    topAtCenter: document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.tagName,
  }));
const scrollTo = async (p, y) => {
  await p.mouse.wheel(0, y);
  await p.waitForTimeout(1500);
};

// ------------------------------------------------------------------ modal 1: double click / double tap on X
out.doubleX = {};
for (const [label, url, w, h, mobile, gap] of [
  ['veil-1440-350ms', '/projects/veil', 1440, 900, false, 350],
  ['veil-1440-450ms', '/projects/veil', 1440, 900, false, 450],
  ['studio-1440-600ms', '/about/studio', 1440, 900, false, 600],
  ['studio-390-tap-350ms', '/about/studio', 390, 844, true, 350],
]) {
  const p = await page(w, h, { mobile, dpr: mobile ? 2 : 1 });
  await p.goto(BASE + url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await scrollTo(p, 600);
  if (mobile) await p.locator('nav a', { hasText: 'Contato' }).first().tap();
  else await p.locator('nav a', { hasText: 'Contato' }).first().click();
  await p.waitForTimeout(2500);
  const box = await p.locator('button[aria-label="Fechar contato"]').boundingBox();
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  if (mobile) {
    await p.touchscreen.tap(x, y);
    await p.waitForTimeout(gap);
    await p.touchscreen.tap(x, y);
  } else {
    await p.mouse.click(x, y);
    await p.waitForTimeout(gap);
    await p.mouse.click(x, y, { clickCount: 2 });
  }
  await p.waitForTimeout(2500);
  out.doubleX[label] = await modalState(p);
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ modal 2: two /contact entries in history
// studio scrolled → Contato → Política → Contato (from the policy page) → Back (closes) → Back (reopens over studio)
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await scrollTo(p, 1200);
  const y0 = await p.evaluate(() => Math.round(scrollY));
  await p.locator('nav a', { hasText: 'Contato' }).first().click();
  await p.waitForTimeout(2500);
  await p.locator('dialog a[href="/privacy-policy"]:visible').first().click();
  await p.waitForTimeout(2500);
  await p.locator('nav a', { hasText: 'Contato' }).first().click();
  await p.waitForTimeout(2500);
  await p.goBack();
  await p.waitForTimeout(2000);
  await p.goBack();
  await p.waitForTimeout(2500);
  const under = await modalState(p);
  await p.locator('button[aria-label="Fechar contato"]').click();
  const after = summary(await ys(p, 1500));
  out.twoContactEntries = { y0, under, afterClose: after, final: await modalState(p) };
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ modal 3: closing right after Política → Back
out.quickClose = {};
for (const [label, how, delay] of [
  ['esc-150ms', 'Escape', 150],
  ['x-150ms', 'X', 150],
  ['x-300ms', 'X', 300],
  ['esc-700ms', 'Escape', 700],
]) {
  const p = await page(1440, 900);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await scrollTo(p, 1200);
  const y0 = await p.evaluate(() => Math.round(scrollY));
  await p.locator('nav a', { hasText: 'Contato' }).first().click();
  await p.waitForTimeout(2500);
  await p.locator('dialog a[href="/privacy-policy"]:visible').first().click();
  await p.waitForTimeout(2500);
  await p.goBack();
  await p.waitForTimeout(delay);
  if (how === 'Escape') await p.keyboard.press('Escape');
  else await p.locator('button[aria-label="Fechar contato"]').click({ timeout: 3000 });
  const v = await ys(p, 2500);
  out.quickClose[label] = {
    y0,
    afterClose: summary(v),
    glideFrames: v.filter((y, i) => i && y !== v[i - 1]).length,
    // each change of position: [frame index after the close (one per animation frame), scrollY]
    steps: v.map((y, i) => [i, y]).filter(([i, y]) => i === 0 || y !== v[i - 1]),
    final: await modalState(p),
  };
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ modal 4: Tab inside step 1
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/contact`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  const where = () =>
    p.evaluate(() => {
      const a = document.activeElement;
      const box = document.querySelector('[class*="ContactContainer"]');
      return {
        focused: `${a?.tagName} ${a?.getAttribute('name') || a?.getAttribute('aria-label') || a?.textContent?.trim().slice(0, 24) || ''}`,
        step: a?.closest('[data-contact-step]')?.getAttribute('data-contact-step') ?? null,
        invisibleInput: a?.getAttribute('name') === 'viewed_case_studies',
        containerScrollTop: box ? Math.round(box.scrollTop) : null,
      };
    });
  await p.locator('dialog a[href="/privacy-policy"]:visible').first().focus();
  const seq = [];
  for (let i = 0; i < 3; i++) {
    await p.keyboard.press('Tab');
    await p.waitForTimeout(300);
    seq.push(await where());
  }
  out.tabAfterPrivacyLink = seq;
  // step change by keyboard: Enter on the first card → step 2 (focus handed over), then "Etapa anterior" → step 1
  await p.locator('[class*="ContactGrid"] > button').first().focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1500);
  const step2 = await where();
  await p.keyboard.press('Tab');
  await p.waitForTimeout(300);
  const step2Tab = await where();
  await p.locator('button[aria-label="Etapa anterior"]').focus();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1500);
  out.keyboardSteps = { afterEnterOnCard: step2, thenTab: step2Tab, afterPrevious: await where() };
  save();
  await p.context().close();
}

// ------------------------------------------------------------------ CTA: reached with Tab, clear of the nav pill
out.ctaFocus = {};
for (const [w, h] of [
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
]) {
  const p = await page(w, h);
  await p.goto(`${BASE}/projects/veil`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  let reached = false;
  for (let i = 0; i < 60 && !reached; i++) {
    await p.keyboard.press('Tab');
    await p.waitForTimeout(250);
    reached = await p.evaluate(() => !!document.activeElement?.className?.includes?.('SimilarProjectsAllWorkCta'));
  }
  await p.waitForTimeout(1500);
  out.ctaFocus[w] = await p.evaluate(() => {
    const a = document.activeElement;
    if (!a?.className?.includes?.('SimilarProjectsAllWorkCta')) return { reached: false };
    const r = a.querySelector('span').getBoundingClientRect();
    let covered = 0;
    let points = 0;
    for (let i = 1; i < 10; i++)
      for (let j = 1; j < 4; j++) {
        const x = r.left + (r.width * i) / 10;
        const y = r.top + (r.height * j) / 4;
        if (y > innerHeight) continue;
        points++;
        if (!a.contains(document.elementFromPoint(x, y))) covered++;
      }
    const pill = document.querySelector('nav ul')?.getBoundingClientRect();
    return { reached: true, scrollY: Math.round(scrollY), maxScroll: document.documentElement.scrollHeight - innerHeight, ctaBottom: Math.round(r.bottom), viewport: innerHeight, pillTop: pill ? Math.round(pill.top) : null, gapToPill: pill ? Math.round(pill.top - r.bottom) : null, pointsCovered: covered, points };
  });
  await p.screenshot({ path: path.join(OUT, `cta-tab-${w}.png`) });
  save();
  await p.context().close();
}

// ================================================================== last check (third review) of the round
// modal: Tab right after Política → Back → Esc keeps its focus scroll (the hold stops at the first key)
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/projects/filmes-hd-online-gratis`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await scrollTo(p, 3000);
  const y0 = await p.evaluate(() => Math.round(scrollY));
  await p.locator('header a', { hasText: /conversar/i }).first().click();
  await p.waitForTimeout(2500);
  await p.locator('dialog a[href="/privacy-policy"]:visible').first().click();
  await p.waitForTimeout(2500);
  await p.goBack();
  await p.waitForTimeout(300);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(450);
  await p.keyboard.press('Tab');
  await p.waitForTimeout(2000);
  out.tabAfterQuickClose = {
    y0,
    ...(await p.evaluate(() => {
      const a = document.activeElement;
      const r = a?.getBoundingClientRect();
      return { url: location.pathname, y: Math.round(scrollY), focused: a?.textContent?.trim().slice(0, 24), focusTop: r ? Math.round(r.top) : null, onScreen: !!r && r.bottom > 0 && r.top < innerHeight };
    })),
  };
  save();
  await p.context().close();
}
// modal: Back → scroll → Forward to /contact → close late (2.5 s): no slide after the close
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/projects/filmes-hd-online-gratis`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  await scrollTo(p, 3000);
  await p.locator('header a', { hasText: /conversar/i }).first().click();
  await p.waitForTimeout(2500);
  await p.goBack();
  await p.waitForTimeout(1500);
  for (let i = 0; i < 8; i++) await p.mouse.wheel(0, -300);
  await p.waitForTimeout(1500);
  const yScrolled = await p.evaluate(() => Math.round(scrollY));
  await p.goForward();
  await p.waitForTimeout(2500);
  const yUnder = await p.evaluate(() => Math.round(scrollY));
  await p.locator('button[aria-label="Fechar contato"]').click();
  const v = await ys(p, 2500);
  out.forwardThenClose = {
    yScrolled,
    yUnder,
    afterClose: summary(v),
    moves: v.filter((y, i) => i && y !== v[i - 1]).length,
    // each change of position: [frame index after the close, scrollY]
    steps: v.map((y, i) => [i, y]).filter(([i, y]) => i === 0 || y !== v[i - 1]),
    final: await modalState(p),
    scrollRestoration: await p.evaluate(() => history.scrollRestoration),
  };
  save();
  await p.context().close();
}
// sound: a loop still loading is kept by the contact / privacy pages (slow network)
out.inFlight = {};
for (const [label, from, go] of [
  ['studio→privacy', '/about/studio', async (p) => p.locator('footer a[href="/privacy-policy"], a[href="/privacy-policy"]').first().click()],
  ['veil→contact', '/projects/veil', async (p) => p.locator('header a', { hasText: /conversar/i }).first().click()],
]) {
  const p = await page(1440, 900);
  await p.goto(BASE + from, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (300 * 1024) / 8, uploadThroughput: (300 * 1024) / 8 });
  await p.mouse.click(700, 120);
  await p.waitForTimeout(600);
  await go(p);
  await p.waitForTimeout(20000);
  out.inFlight[label] = { url: await p.evaluate(() => location.pathname), loops: (await p.evaluate(() => window.__a.loops)).map((l) => `${name(l.len)}${l.ended ? '(ended)' : ''}`), final: await soundState(p) };
  save();
  await p.context().close();
}
// sound: the contact low-pass holds when the contact opens < 2 s after arriving on a page
{
  const p = await page(1440, 900);
  await p.addInitScript(() => {
    const c = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (d, ...r) {
      if (this instanceof AudioBufferSourceNode && d instanceof BiquadFilterNode && this.buffer?.duration >= 20) window.__lp = d;
      return c.call(this, d, ...r);
    };
  });
  await p.goto(`${BASE}/about/process`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(3000);
  await p.mouse.click(700, 120);
  await p.waitForTimeout(3000);
  await p.locator('[class*="AboutLayoutToggle"] a, a[href="/about/studio"]').first().click();
  await p.waitForTimeout(800);
  await p.locator('nav a', { hasText: 'Contato' }).first().click();
  const f = [];
  for (const t of [600, 1500, 2500, 4000]) {
    await p.waitForTimeout(t - (f.length ? [600, 1500, 2500, 4000][f.length - 1] : 0));
    f.push([t, await p.evaluate(() => (window.__lp ? Math.round(window.__lp.frequency.value) : null))]);
  }
  out.lowpassAfterQuickOpen = { url: await p.evaluate(() => location.pathname), frequency: f };
  save();
  await p.context().close();
}
// sound: a loop whose download failed (offline) is fetched again later
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await p.mouse.click(700, 120);
  await p.waitForTimeout(2500);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await p.waitForTimeout(1500);
  await p.locator('nav a', { hasText: 'Projetos' }).first().click();
  await p.waitForTimeout(4000);
  await p.locator('nav a', { hasText: 'Sobre' }).first().click();
  await p.waitForTimeout(5000);
  out.retryAfterOffline = { requests: await p.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('other')).length), loops: (await p.evaluate(() => window.__a.loops)).map((l) => `${name(l.len)}${l.ended ? '(ended)' : ''}`), final: await soundState(p) };
  save();
  await p.context().close();
}
// sound: /index (the home alias) plays the home loop after Back
{
  const p = await page(390, 844, { mobile: true, dpr: 2 });
  await p.goto(`${BASE}/index`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(11000);
  await p.touchscreen.tap(195, 120);
  await p.waitForTimeout(2500);
  await p.goto(`${BASE}/index`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.evaluate(() => history.pushState(null, '', '/projects/veil')).catch(() => {});
  out.indexAlias = { note: 'see indexAliasBack' };
  await p.context().close();
  const q = await page(1440, 900);
  await q.goto(`${BASE}/index`, { waitUntil: 'domcontentloaded' });
  await q.waitForTimeout(11000);
  await q.mouse.click(1300, 820);
  await q.waitForTimeout(2500);
  await q.locator('[class*="GridListToggle"] button').nth(1).click();
  await q.waitForTimeout(1500);
  await q.locator('a[href="/projects/veil"]').first().click();
  await q.waitForTimeout(5000);
  const onProject = await soundState(q);
  await q.goBack();
  await q.waitForTimeout(6000);
  out.indexAlias = { onProject: { url: onProject.url, active: onProject.active.map(name) }, afterBack: await soundState(q) };
  out.indexAlias.afterBack.active = out.indexAlias.afterBack.active.map(name);
  save();
  await q.context().close();
}

await b.close();
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
