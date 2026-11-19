// Every image of the site, as the browser loads it (GET only, normal browser settings), on any base URL (the local
// production server or a Vercel deployment). Desktop 1440 × 900 and phone 390 × 844 (mobile context, DPR 2).
//   node scripts/brand/owner-checks/image-audit.mjs <baseUrl> <outDir>
// Areas: home (WebGL grid, then the list view, with a hover over each row), both project pages, Estúdio, Processo,
// the contact (hover over each card on desktop) and the privacy policy (footer image).
// For every <img>: it is scrolled into view (lazy loading starts) and awaited, then src, currentSrc, srcset, sizes,
// loading, complete, naturalWidth × naturalHeight and the result of img.decode() are recorded. For every image
// response (any <img>, CSS or WebGL texture request, /api/img included): URL, status, content type and size; every
// failed request with its error. A broken image = complete with naturalWidth 0, a decode() error, or an image
// request answered 4xx / 5xx or failed. The grid's empty cells are drawings inside the WebGL canvas, not images:
// they never show up as <img> elements, and their textures (the work-grid atlases) are recorded as requests.
// Writes image-audit.json. Optional ONLY=view:page[,…] (e.g. ONLY=mobile:contact) runs just those cases.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const BASE = process.argv[2].replace(/\/$/, '');
const OUT = path.resolve(process.argv[3]);
fs.mkdirSync(OUT, { recursive: true });
const out = { base: BASE, build: null, at: new Date().toISOString(), views: {} };
const save = () => fs.writeFileSync(path.join(OUT, 'image-audit.json'), JSON.stringify(out, null, 1));
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const IMAGE_URL = /\/api\/img\?|\.(jpe?g|png|webp|avif|gif|svg)(\?|$)/i;

async function auditImages(p) {
  // bring every <img> into view so lazy ones start, then wait for each to settle and decode
  return p.evaluate(async () => {
    const imgs = [...document.querySelectorAll('img')];
    const rows = [];
    for (const img of imgs) {
      // an image the layout does not display (e.g. the contact cards' images below 768 px, display: none) is never
      // fetched when lazy, and its decode() never settles: recorded as not displayed, not as broken
      const hiddenByLayout = img.getClientRects().length === 0;
      let decode = 'not displayed';
      if (!hiddenByLayout) {
        img.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 120));
        if (!img.complete) await new Promise((r) => (img.addEventListener('load', r, { once: true }), img.addEventListener('error', r, { once: true }), setTimeout(r, 8000)));
        decode = await Promise.race([
          img.decode().then(
            () => 'ok',
            (e) => String(e && e.message ? e.message : e).slice(0, 120),
          ),
          new Promise((r) => setTimeout(() => r('decode timeout (8 s)'), 8000)),
        ]);
      }
      const box = img.closest('[class]');
      rows.push({
        where: box ? String(box.className).split(' ')[0].slice(0, 60) : img.parentElement?.tagName,
        alt: img.alt.slice(0, 50),
        src: img.getAttribute('src'),
        currentSrc: img.currentSrc,
        srcset: (img.getAttribute('srcset') || '').slice(0, 200),
        sizes: img.getAttribute('sizes'),
        loading: img.loading,
        complete: img.complete,
        natural: `${img.naturalWidth}x${img.naturalHeight}`,
        decode,
        broken: !hiddenByLayout && ((img.complete && img.naturalWidth === 0) || decode !== 'ok'),
        hiddenByLayout,
      });
    }
    return rows;
  });
}

const PAGES = [
  ['home', '/'],
  ['filmes', '/projects/filmes-hd-online-gratis'],
  ['veil', '/projects/veil'],
  ['studio', '/about/studio'],
  ['process', '/about/process'],
  ['contact', '/contact'],
  ['privacy', '/privacy-policy'],
];
for (const [view, w, h, mobile] of [
  ['desktop', 1440, 900, false],
  ['mobile', 390, 844, true],
]) {
  out.views[view] = {};
  for (const [tag, route] of PAGES) {
    if (ONLY.length && !ONLY.includes(`${view}:${tag}`)) continue;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: 'pt-BR' });
    const p = await ctx.newPage();
    const responses = [];
    const failed = [];
    p.on('response', (r) => {
      const u = r.url();
      if (r.request().resourceType() === 'image' || IMAGE_URL.test(u)) responses.push({ url: u.replace(BASE, ''), status: r.status(), type: r.headers()['content-type'] || '', bytes: Number(r.headers()['content-length'] || 0) || null, err: r.status() >= 400 ? null : undefined });
    });
    p.on('requestfailed', (r) => {
      const u = r.url();
      if (r.resourceType() === 'image' || IMAGE_URL.test(u)) failed.push({ url: u.replace(BASE, ''), error: r.failure()?.errorText || '' });
    });
    await p.goto(BASE + route, { waitUntil: 'networkidle', timeout: 90000 });
    out.build ??= await p.evaluate(() => document.documentElement.innerHTML.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]{10,})/)?.[1] ?? null);
    await p.waitForTimeout(tag === 'home' ? 9000 : 2500);
    // walk down the page (reveals, lazy images), then audit
    await p.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.6)) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 250));
      }
    });
    await p.waitForTimeout(1500);
    const rec = { route, images: [] };
    if (tag === 'home') {
      rec.canvas = await p.evaluate(() => document.querySelectorAll('canvas').length);
      rec.gridImages = await auditImages(p);
      // the list view, with a hover over each row (desktop)
      const listBtn = p.locator('button[aria-pressed="false"]').first();
      if (await listBtn.count()) {
        if (mobile) await listBtn.tap().catch(() => {});
        else await listBtn.click().catch(() => {});
        await p.waitForTimeout(2500);
        if (!mobile) for (const row of await p.locator('a[href^="/projects/"]').all()) await row.hover({ timeout: 2000 }).catch(() => {});
        await p.waitForTimeout(1200);
      }
      rec.images = await auditImages(p);
    } else if (tag === 'contact') {
      if (!mobile) for (const card of await p.locator('dialog button, dialog a').all()) await card.hover({ timeout: 1500 }).catch(() => {});
      await p.waitForTimeout(1200);
      rec.images = await auditImages(p);
    } else {
      rec.images = await auditImages(p);
    }
    await p.waitForTimeout(1000);
    rec.responses = responses;
    rec.failedRequests = failed;
    rec.summary = {
      imgElements: rec.images.length,
      broken: rec.images.filter((i) => i.broken).length,
      imageResponses: responses.length,
      errorResponses: responses.filter((r) => r.status >= 400).length,
      failedRequests: failed.length,
    };
    out.views[view][tag] = rec;
    save();
    await ctx.close();
  }
}
await b.close();
for (const [v, pages] of Object.entries(out.views))
  for (const [t, r] of Object.entries(pages)) console.log(v.padEnd(8), t.padEnd(8), JSON.stringify(r.summary));
console.log('build', out.build);
