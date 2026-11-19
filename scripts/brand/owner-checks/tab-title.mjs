// The browser tab title on every route and through navigation (GET only), on any base URL.
//   node scripts/brand/owner-checks/tab-title.mjs <baseUrl> <outDir>
// - Server HTML: the <title> elements of each route's response (/, /index, both projects, Estúdio, Processo, contact,
//   privacy policy, an unknown page, an unknown project, /500, Next's own 500 document /_global-error), with the
//   status, og:title and twitter:title.
// - Browser: document.title after load and hydration, on desktop and phone.
// - Navigation (desktop and phone): home → Estúdio (nav) → Processo (toggle) → contact (nav "Contato") → Esc →
//   privacy policy (footer link) → Back → Forward → reload.
// - Soft navigations where a title used to go missing for a frame (desktop and phone): project → privacy policy (a
//   client navigation, router.push: project pages have no footer), reload, Back to the project across the reload,
//   Forward; project, then Estúdio → contact → privacy policy (the link inside the modal) → Back.
// A MutationObserver records every title the document shows on the way, and both it and a requestAnimationFrame loop
// count the moments with no <title> element at all (`noTitle`, `noTitleFrames`): a title that is missing or different
// for a single frame is caught too. Hooks on insertBefore/appendChild count a <title> inserted while document.title is
// "" (`emptyTitleInserts`): a state that starts and ends inside one task, invisible to the observer and to frames, but
// which the browser's own tab title can follow for a moment. Hooks on removeChild count the removals that leave no
// <title> (`removedToZero`, informational: Next's bare 404 shell clears the head that way when it renders on the client).
// Writes tab-title.json; every title must be exactly EXPECTED, the document must never be without one and no empty
// <title> may be inserted.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const BASE = process.argv[2].replace(/\/$/, '');
const OUT = path.resolve(process.argv[3]);
const EXPECTED = 'Olwtelet Productions';
fs.mkdirSync(OUT, { recursive: true });
const out = { base: BASE, expected: EXPECTED, server: {}, browser: {}, navigation: {} };
const save = () => fs.writeFileSync(path.join(OUT, 'tab-title.json'), JSON.stringify(out, null, 1));
const ROUTES = ['/', '/index', '/projects/filmes-hd-online-gratis', '/projects/veil', '/about/studio', '/about/process', '/contact', '/privacy-policy', '/pagina-que-nao-existe', '/projects/projeto-que-nao-existe', '/500', '/_global-error'];

// server HTML
for (const r of ROUTES) {
  const res = await fetch(BASE + r, { redirect: 'manual', headers: { accept: 'text/html' } });
  const html = await res.text();
  const titles = [...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => m[1]);
  const og = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? null;
  const tw = html.match(/<meta name="twitter:title" content="([^"]*)"/)?.[1] ?? null;
  out.server[r] = { status: res.status, titles, ok: titles.length > 0 && titles.every((t) => t === EXPECTED), ogTitle: og, twitterTitle: tw };
}
save();

const b = await chromium.launch({ channel: 'chrome', headless: true });
// from the parsed document on (before that the title is empty: nothing is shown yet), every distinct title in order
const OBSERVE = () => {
  window.__titles = [];
  window.__noTitle = 0;
  window.__noTitleFrames = 0;
  window.__emptyInserts = 0;
  window.__removedToZero = 0;
  const count = () => [...document.getElementsByTagName('title')].filter((t) => t.namespaceURI === 'http://www.w3.org/1999/xhtml').length;
  const isTitle = (n) => n && n.nodeName === 'TITLE' && n.namespaceURI === 'http://www.w3.org/1999/xhtml';
  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (n, ref) {
    const r = insertBefore.call(this, n, ref);
    if (isTitle(n) && document.title === '') window.__emptyInserts++;
    return r;
  };
  const appendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function (n) {
    const r = appendChild.call(this, n);
    if (isTitle(n) && document.title === '') window.__emptyInserts++;
    return r;
  };
  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (n) {
    const r = removeChild.call(this, n);
    if (isTitle(n) && count() === 0) window.__removedToZero++;
    return r;
  };
  const push = () => {
    if (count() === 0) window.__noTitle++;
    if (window.__titles.at(-1) !== document.title) window.__titles.push(document.title);
  };
  const frame = () => {
    if (count() === 0) window.__noTitleFrames++;
    requestAnimationFrame(frame);
  };
  const start = () => {
    push();
    new MutationObserver(push).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    requestAnimationFrame(frame);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
};
const COUNTERS = () => ({
  url: location.pathname,
  seen: window.__titles,
  noTitle: window.__noTitle,
  noTitleFrames: window.__noTitleFrames,
  emptyTitleInserts: window.__emptyInserts,
  removedToZero: window.__removedToZero,
});
for (const [view, w, h, mobile] of [
  ['desktop', 1440, 900, false],
  ['mobile', 390, 844, true],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: 'pt-BR' });
  await ctx.addInitScript(OBSERVE);
  const p = await ctx.newPage();
  const tap = (loc) => (mobile ? loc.tap() : loc.click());
  out.browser[view] = {};
  for (const r of ROUTES) {
    await p.goto(BASE + r, { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(r === '/' || r === '/index' ? 4000 : 2500);
    const st = await p.evaluate(COUNTERS);
    out.browser[view][r] = { title: await p.title(), ...st, ok: st.seen.every((t) => t === EXPECTED) && !st.noTitle && !st.noTitleFrames && !st.emptyTitleInserts };
  }
  save();
  // navigation path
  const steps = [];
  // each step starts from the current title, so `seen` and the counters cover that step alone
  const reset = () => p.evaluate(() => {
    window.__titles = [document.title];
    window.__noTitle = 0;
    window.__noTitleFrames = 0;
    window.__emptyInserts = 0;
    window.__removedToZero = 0;
  });
  const step = async (label) => {
    await p.waitForTimeout(1800);
    const st = await p.evaluate(COUNTERS);
    steps.push({ step: label, title: await p.title(), ...st, ok: st.seen.every((t) => t === EXPECTED) && !st.noTitle && !st.noTitleFrames && !st.emptyTitleInserts });
    await reset();
  };
  const toFooter = async () => {
    await p.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await p.waitForTimeout(1500);
  };
  await p.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(9000);
  await step('home');
  await tap(p.locator('nav a[href="/about/studio"]').first());
  await step('nav → Estúdio');
  await tap(p.locator('a[href="/about/process"]:visible').first());
  await step('toggle → Processo');
  await tap(p.locator('nav a', { hasText: 'Contato' }).first());
  await step('nav → contato (modal)');
  await p.keyboard.press('Escape');
  await step('Esc');
  await toFooter();
  await tap(p.locator('footer a[href="/privacy-policy"]').first());
  await step('rodapé → política');
  await p.goBack();
  await step('Voltar');
  await p.goForward();
  await step('Avançar');
  await p.reload({ waitUntil: 'networkidle' });
  await step('recarregar');
  // project → privacy policy as a client navigation (project pages have no footer; router.push is the transition a
  // link makes), reload, Back to the project across the reload, Forward
  await p.goto(BASE + '/projects/veil', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(3000);
  await reset();
  await p.evaluate(() => window.next.router.push('/privacy-policy'));
  await step('projeto → política (navegação interna)');
  await p.reload({ waitUntil: 'networkidle' });
  await step('recarregar a política');
  await p.goBack();
  await step('Voltar ao projeto, depois do recarregamento');
  await p.goForward();
  await step('Avançar para a política');
  // project, then Estúdio → contact → privacy policy (the link inside the modal) → Back
  for (const [from, label] of [['/projects/veil', 'projeto'], ['/about/studio', 'Estúdio']]) {
    await p.goto(BASE + from, { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(3000);
    await reset();
    await tap(p.locator('nav a', { hasText: 'Contato' }).first());
    await step(`${label} → contato (modal)`);
    await tap(p.locator('dialog a[href="/privacy-policy"]:visible').first());
    await step('contato → política (link do modal)');
    await p.goBack();
    await step('Voltar');
  }
  out.navigation[view] = { steps, ok: steps.every((s) => s.title === EXPECTED && s.ok) };
  save();
  await ctx.close();
}
await b.close();
const bad = [
  ...Object.entries(out.server).filter(([, v]) => !v.ok).map(([k]) => `server ${k}`),
  ...Object.entries(out.browser).flatMap(([v, rs]) => Object.entries(rs).filter(([, r]) => !r.ok).map(([k]) => `${v} ${k}`)),
  ...Object.entries(out.navigation).filter(([, n]) => !n.ok).map(([v]) => `navigation ${v}`),
];
console.log(bad.length ? `NOT OK: ${bad.join(', ')}` : `all titles "${EXPECTED}"`);
// informational: where a removal left the document with no <title> inside one task (Next's bare 404 shell)
const zero = [...Object.entries(out.browser).flatMap(([v, rs]) => Object.entries(rs).filter(([, r]) => r.removedToZero).map(([k, r]) => `${v} ${k} (${r.removedToZero})`)), ...Object.entries(out.navigation).flatMap(([v, n]) => n.steps.filter((x) => x.removedToZero).map((x) => `${v} ${x.step} (${x.removedToZero})`))];
console.log(`removals to zero <title> inside one task: ${zero.length ? zero.join(', ') : 'none'}`);

