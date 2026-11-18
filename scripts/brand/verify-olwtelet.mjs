// Visual + functional check of the Olwtelet Productions site on a running server (GET pages, local only).
//   node scripts/brand/verify-olwtelet.mjs [--base http://localhost:3000] [--out <dir>] [--only home,list,…]
//                                          [--viewports m360,m390,…] [--dist .next] [--block-external] [--headed]
// Viewports: 1440×900, 1920×1080, 768×1024, 390×844 and 360×800 (mobile). Extra sizes run only when named in
// --viewports: d1024, d1280, d1366, t900, m375s (375×667), m360s (360×640), m375se (375×548), m390s (390×664) and m320
// (320×568). --block-external aborts every request to
// another origin (as if Adobe Fonts did not load). Writes PNG captures + report.json to --out; exits 1 on any failure,
// and a run that stops part-way is marked complete: false with the error in report.aborted.
// Build identification (report.build): the local build (<dist>/BUILD_ID) is tied to what the browser actually loaded:
//   - every /_next/static/** response is hashed (SHA-256) and compared with the same file under <dist>/static/;
//   - the build id Next writes into the flight data (field "b") is read from the bodies the browser received: the HTML
//     document of each page load (main frame) and the RSC responses of client navigations and prefetches. Both are
//     compared with <dist>/BUILD_ID (self.__next_f cannot be used: Next empties it after hydration).
// The build counts as verified only if every loaded static file was read and matches byte for byte, none is missing
// locally, no static request failed (4xx/5xx or network error), every capture comes from an HTML document that carries
// the local BUILD_ID, no response carries another, and <dist>/BUILD_ID is the same (id and file time) at the end.
// Each capture records its time, URL, the document it was loaded from and the build ids seen (document and RSC).
// Checks: intro frames (no old mascot: captures at fixed times), grid (published tile, in-development tile, empty cells
// not clickable), list view (groups, counts, links, filters, empty state; layout: horizontal overflow, words broken
// across lines, overlapping glyphs, text within 6 px of a fixed control at rest and scrolled to the end, header
// title/count gap, ellipsis measured on unrounded widths), case page and its external link, Veil page,
// About (Estúdio / Processo), contact modal (topics, honest error on submit), footer, 404 of old URLs, metadata.
// On every capture: floating controls (header links/buttons, Filtrar, About and grid/list toggles, bottom navigation,
// sound label, contact tiles and privacy link) at least 4 px apart.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = require('playwright');
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const BASE = arg('base', 'http://localhost:3000');
const OUT = path.resolve(arg('out', path.join(ROOT, 'docs/evidence/olwtelet/verify')));
const ONLY = arg('only', '') ? arg('only', '').split(',') : null;
const HEADED = process.argv.includes('--headed');
const DIST = arg('dist', process.env.NEXT_DIST_DIR || '.next');
const ONLY_VP = arg('viewports', '') ? arg('viewports', '').split(',') : null;
fs.mkdirSync(OUT, { recursive: true });
const BLOCK_EXTERNAL = process.argv.includes('--block-external'); // abort every request to another origin (e.g. Adobe Fonts unavailable)
const VIEWPORTS = [
  { tag: 'd1440', width: 1440, height: 900, mobile: false },
  { tag: 'd1920', width: 1920, height: 1080, mobile: false },
  { tag: 'm390', width: 390, height: 844, mobile: true },
  { tag: 'm360', width: 360, height: 800, mobile: true },
  { tag: 't768', width: 768, height: 1024, mobile: false },
  // extra sizes, only when named in --viewports: laptop widths between the bands, short phones
  { tag: 'd1024', width: 1024, height: 768, mobile: false, extra: true },
  { tag: 'd1280', width: 1280, height: 800, mobile: false, extra: true },
  { tag: 'd1366', width: 1366, height: 768, mobile: false, extra: true },
  { tag: 't900', width: 900, height: 900, mobile: false, extra: true },
  { tag: 'm375s', width: 375, height: 667, mobile: true, extra: true },
  { tag: 'm360s', width: 360, height: 640, mobile: true, extra: true },
  { tag: 'm375se', width: 375, height: 548, mobile: true, extra: true }, // 375 × 667 phone with the browser toolbars
  { tag: 'm390s', width: 390, height: 664, mobile: true, extra: true }, // 390 × 844 phone with the browser toolbars
  { tag: 'm320', width: 320, height: 568, mobile: true, extra: true }, // below the targets: no horizontal scroll
].filter((v) => (ONLY_VP ? ONLY_VP.includes(v.tag) : !v.extra));
const report = { base: BASE, startedAt: new Date().toISOString(), complete: false, blockExternal: BLOCK_EXTERNAL, viewports: {}, failures: [], captures: [] };

// ---------------------------------------------------------------------------------------------- build identification
const DIST_DIR = path.resolve(ROOT, DIST);
const readBuildId = () => {
  try {
    const file = path.join(DIST_DIR, 'BUILD_ID');
    return { id: fs.readFileSync(file, 'utf8').trim(), modified: fs.statSync(file).mtime.toISOString() };
  } catch {
    return { id: null, modified: null };
  }
};
const LOCAL_BUILD = readBuildId(); // read once, at the start of the run (id and file time together)
const LOCAL_BUILD_ID = LOCAL_BUILD.id;
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const localHash = new Map();
const staticChecks = new Map(); // url path → { served, local, match }
const unreadable = new Set(); // static files the browser loaded whose body could not be read (cannot be compared)
const staticFailed = new Map(); // url path → HTTP status ≥ 400 or network error of a /_next/static request
const staticAborted = new Set(); // /_next/static requests cancelled by a navigation (not counted against the build)
const pending = new Set(); // hash / flight reads still in progress (awaited before each capture and before closing)
const track = (p) => {
  pending.add(p);
  p.finally(() => pending.delete(p)).catch(() => {});
  return p;
};
const settle = async () => {
  while (pending.size) await Promise.allSettled([...pending]);
};
function localSha(rel) {
  if (!localHash.has(rel)) {
    const file = path.join(DIST_DIR, 'static', rel);
    localHash.set(rel, file.startsWith(path.join(DIST_DIR, 'static')) && fs.existsSync(file) ? sha(fs.readFileSync(file)) : null);
  }
  return localHash.get(rel);
}
async function checkStatic(response) {
  const u = new URL(response.url());
  if (u.origin !== new URL(BASE).origin || !u.pathname.startsWith('/_next/static/')) return;
  if (response.status() >= 400) staticFailed.set(u.pathname, `HTTP ${response.status()}`);
  if (response.status() !== 200) return;
  if (staticChecks.has(u.pathname)) return;
  let body;
  try {
    body = await response.body();
  } catch {
    unreadable.add(u.pathname);
    return;
  }
  unreadable.delete(u.pathname);
  const rel = decodeURIComponent(u.pathname.slice('/_next/static/'.length));
  const served = sha(body);
  const local = localSha(rel);
  staticChecks.set(u.pathname, { served, local, match: !!local && local === served });
}
/**
 * Build id in the flight data Next writes into each response the page received: the HTML document (inline flight
 * chunks, quotes escaped) and the RSC responses of client navigations (text/x-component). Field "b".
 */
const BUILD_FIELD = [/\\"b\\":\\"([A-Za-z0-9_-]{8,})\\"/, /"b":"([A-Za-z0-9_-]{8,})"/];
async function flightIdOf(response) {
  const type = response.headers()['content-type'] || '';
  const isDoc = response.request().resourceType() === 'document';
  if (!isDoc && !type.includes('text/x-component')) return null;
  let text;
  try {
    text = await response.text();
  } catch {
    return null;
  }
  for (const re of BUILD_FIELD) {
    const m = re.exec(text);
    if (m) return m[1];
  }
  return null;
}
const flightIds = new Map(); // build id of the capture's HTML document → number of captures
const responseIds = { document: new Map(), rsc: new Map() }; // build id → number of responses carrying it
const fail = (vp, msg) => {
  report.failures.push(`${vp}: ${msg}`);
  console.log('  FAIL', vp, msg);
};
const want = (name) => !ONLY || ONLY.includes(name);
const wait = (p, ms) => p.waitForTimeout(ms);

const browser = await chromium.launch({ channel: 'chrome', headless: !HEADED, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
try {
  for (const vp of VIEWPORTS) {
    const r = (report.viewports[vp.tag] = { console: [], external: [], checks: {} });
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile, locale: 'pt-BR' });
    const page = await ctx.newPage();
    if (BLOCK_EXTERNAL)
      await page.route(
        (u) => u.origin !== new URL(BASE).origin && (u.protocol === 'http:' || u.protocol === 'https:'),
        (route) => route.abort(),
      );
    // doc: the HTML document of the current page load (main frame); rsc: the latest RSC response with a build id
    // received since that document was requested
    let doc = { url: null, id: null };
    let rsc = null;
    const isMainDoc = (q) => {
      try {
        return q.resourceType() === 'document' && q.frame() === page.mainFrame();
      } catch {
        return false; // service-worker requests have no frame
      }
    };
    page.on('request', (q) => {
      if (!isMainDoc(q)) return;
      doc = { url: q.url(), id: null };
      rsc = null;
    });
    // a /_next/static request that never got a response (e.g. a stylesheet refused on a 404 text/plain body). Requests
    // cancelled by a navigation (net::ERR_ABORTED) are listed apart: they say nothing about the build.
    page.on('requestfailed', (q) => {
      const u = new URL(q.url());
      if (u.origin !== new URL(BASE).origin || !u.pathname.startsWith('/_next/static/')) return;
      const why = q.failure()?.errorText || 'failed';
      if (/ERR_ABORTED/.test(why)) staticAborted.add(u.pathname);
      else staticFailed.set(u.pathname, why);
    });
    page.on('response', (res) => {
      track(checkStatic(res));
      if (new URL(res.url()).origin !== new URL(BASE).origin) return;
      const main = isMainDoc(res.request());
      track(
        flightIdOf(res).then((id) => {
          if (!id) return;
          const kind = res.request().resourceType() === 'document' ? 'document' : 'rsc';
          responseIds[kind].set(id, (responseIds[kind].get(id) || 0) + 1);
          if (main && doc.url === res.url()) doc = { url: res.url(), id };
          else if (kind === 'rsc') rsc = id;
        }),
      );
    });
    page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && r.console.push(`${m.type()}: ${m.text().slice(0, 200)}`));
    page.on('pageerror', (e) => r.console.push(`pageerror: ${String(e).slice(0, 200)}`));
    page.on('request', (q) => {
      const u = new URL(q.url());
      if (u.origin !== new URL(BASE).origin && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) r.external.push(`${q.method()} ${u.host}${u.pathname}`.slice(0, 120));
    });
    // floating controls must not touch each other: header links and buttons, "Filtrar", the About and grid/list
    // toggles, the bottom navigation, the sound label, and in the contact modal the contact tiles and the privacy
    // link. Only what is visible and on top somewhere counts (not what sits behind an open modal); boxes must stay
    // CTRL_CLEAR px apart.
    const controlOverlaps = () =>
      page.evaluate(() => {
        const CTRL_CLEAR = 4;
        const sel = [
          'header a',
          'header button',
          'button[class*="Button"]',
          '[class*="AboutLayoutToggle"] ul',
          '[class*="GridListToggle"] ul',
          'nav ul',
          '[class*="SoundLabel"]',
          '[class*="ContactContentContainer"] > a',
          '[class*="PrivacyLinkInline"]',
          '[class*="TileContact"]',
        ].join(', ');
        const floating = (e) => {
          for (let x = e; x && x !== document.body; x = x.parentElement) {
            const p = getComputedStyle(x).position;
            if (p === 'fixed' || p === 'sticky') return true;
          }
          return false;
        };
        const onTop = (e, r) => {
          const pts = [
            [0.5, 0.5],
            [0.15, 0.5],
            [0.85, 0.5],
            [0.5, 0.2],
            [0.5, 0.8],
          ];
          return pts.some(([fx, fy]) => {
            const x = r.left + r.width * fx;
            const y = r.top + r.height * fy;
            if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
            const hit = document.elementFromPoint(x, y);
            return !!hit && (hit === e || e.contains(hit));
          });
        };
        const items = [...document.querySelectorAll(sel)]
          .map((e) => ({ e, r: e.getBoundingClientRect() }))
          .filter(({ e, r }) => r.width > 1 && r.height > 1 && e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && floating(e) && onTop(e, r));
        const name = (e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 24);
        const out = [];
        for (let i = 0; i < items.length; i++)
          for (let j = i + 1; j < items.length; j++) {
            const a = items[i];
            const b = items[j];
            if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
            const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
            const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
            // w / h: shared width / height of the two boxes (negative = the gap between them on that axis)
            if (w > -CTRL_CLEAR && h > -CTRL_CLEAR) out.push(`${name(a.e)} × ${name(b.e)} (w ${Math.round(w)} h ${Math.round(h)})`);
          }
        return out;
      });
    const shot = async (name, full = false) => {
      const file = `${vp.tag}-${name}.png`;
      await page.screenshot({ path: path.join(OUT, file), fullPage: full });
      const overlapsNow = await controlOverlaps().catch((e) => [`(check failed: ${String(e).slice(0, 80)})`]);
      if (overlapsNow.length) fail(vp.tag, `capture ${file}: floating controls touch or overlap: ${overlapsNow.join(' | ')}`);
      await settle();
      const id = doc.id;
      flightIds.set(id, (flightIds.get(id) || 0) + 1);
      report.captures.push({
        file,
        at: new Date().toISOString(),
        url: page.url().replace(BASE, ''),
        buildId: id,
        buildIdFrom: 'document',
        documentUrl: doc.url ? doc.url.replace(BASE, '') : null,
        lastRscBuildId: rsc,
      });
      if (!id) fail(vp.tag, `capture ${file}: no build id in its HTML document (${doc.url})`);
      else if (LOCAL_BUILD_ID && id !== LOCAL_BUILD_ID) fail(vp.tag, `capture ${file} shows build ${id}, local build is ${LOCAL_BUILD_ID}`);
      if (rsc && LOCAL_BUILD_ID && rsc !== LOCAL_BUILD_ID) fail(vp.tag, `capture ${file}: RSC response carries build ${rsc}, local build is ${LOCAL_BUILD_ID}`);
    };
    console.log('==', vp.tag);

    if (want('home')) {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      r.checks.webgl2 = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
      // intro: captures through the loader, the pixel mosaic, the frame cross-fade and the particle explosion
      const t0 = Date.now();
      for (const t of [300, 1200, 2200, 3000, 3600, 4200, 4800, 5600, 6600, 8000]) {
        const dt = t - (Date.now() - t0);
        if (dt > 0) await wait(page, dt);
        await shot(`intro-${String(t).padStart(5, '0')}`);
      }
      await wait(page, 2500);
      await shot('home-grid');
      r.checks.homeTitle = await page.title();
      r.checks.lang = await page.evaluate(() => document.documentElement.lang);
      r.checks.h1 = await page.evaluate(() => [...document.querySelectorAll('h1')].map((h) => h.textContent));
      r.checks.headerMark = await page.evaluate(() => {
        const s = document.querySelector('header svg[class*="HomeMark"]');
        if (!s) return null;
        const b = s.getBoundingClientRect();
        return { w: Math.round(b.width), h: Math.round(b.height), color: getComputedStyle(s).color };
      });
      r.checks.clock = await page.evaluate(() => [...document.querySelectorAll('[class*="Timezone"]')].map((e) => e.textContent?.trim()).filter(Boolean).slice(0, 2));
      r.checks.nav = await page.evaluate(() => [...document.querySelectorAll('nav a')].map((a) => `${a.textContent}→${a.getAttribute('href')}`));
      // grid: click several empty-looking places (must stay on "/"), then the published tile
      if (r.checks.webgl2) {
        const W = vp.width, H = vp.height;
        const probes = [
          [0.12, 0.2], [0.88, 0.2], [0.12, 0.82], [0.88, 0.82], [0.5, 0.1],
        ];
        let navigatedFromEmpty = 0;
        for (const [fx, fy] of probes) {
          // only the grid itself: on phones up to ~670 px tall, (0.5, 0.1) is the "Filtrar" button, whose panel then
          // covers the grid/list toggle (it is a control, not an empty cell)
          const over = await page.evaluate(([x, y]) => {
            const e = document.elementFromPoint(x, y);
            return e && e.tagName !== 'CANVAS' ? (e.closest('button,a')?.textContent || e.tagName).trim().slice(0, 24) : null;
          }, [W * fx, H * fy]);
          if (over) {
            (r.checks.probeClicks ||= []).push(`${fx},${fy}→skipped (control: ${over})`);
            continue;
          }
          await page.mouse.move(W * fx, H * fy);
          await wait(page, 350);
          await page.mouse.click(W * fx, H * fy);
          await wait(page, 900);
          const dest = new URL(page.url()).pathname;
          (r.checks.probeClicks ||= []).push(`${fx},${fy}→${dest}`);
          // landing on a project tile is fine (on narrow screens the tiles are large); anything else is a failure
          if (dest !== '/' && !['/projects/filmes-hd-online-gratis', '/projects/veil'].includes(dest)) fail(vp.tag, `probe click at ${fx},${fy} went to ${dest}`);
          if (dest !== '/') {
            navigatedFromEmpty++;
            await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
            await wait(page, 9000);
          }
        }
        r.checks.probeNavigations = navigatedFromEmpty;
        // hover the projects: slot 0 is just below-left of the centre, slot 2 just above-right
        const tile = await page.evaluate(() => {
          const c = document.querySelector('#work-grid canvas');
          const b = c?.getBoundingClientRect();
          return b ? { w: b.width, h: b.height } : null;
        });
        if (tile) {
          await page.mouse.move(W * 0.42, H * 0.62);
          await wait(page, 900);
          await shot('home-hover-published');
          await page.mouse.move(W * 0.58, H * 0.38);
          await wait(page, 900);
          await shot('home-hover-veil');
        }
      }
      // list view
      const toggle = page.locator('button', { hasText: /lista|list/i }).first();
      const toggles = await page.locator('[class*="GridListToggle"] button, [class*="Toggle"] button').count();
      r.checks.toggleButtons = toggles;
      const listBtn = page.locator('[class*="GridListToggle"] button').nth(1);
      if (await listBtn.count()) {
        await listBtn.click();
        await wait(page, 1500);
        await shot('home-list');
        r.checks.list = await page.evaluate(() => {
          const w = document.querySelector('[class*="ListViewWrapper"]');
          return w ? w.innerText.replace(/\n+/g, ' | ').slice(0, 400) : null;
        });
        await listBtn.click().catch(() => {});
        await wait(page, 800);
      } else void toggle;
      // filters panel + empty state
      const filterBtn = page.locator('button', { hasText: /^Filtrar$/ }).first();
      if (await filterBtn.count()) {
        await filterBtn.click();
        await wait(page, 1300);
        await shot('home-filters');
        r.checks.filters = await page.evaluate(() => document.querySelector('#work-grid-filters-overlay')?.innerText.replace(/\n+/g, ' | ').slice(0, 300) ?? null);
        await page.locator('button', { hasText: /^Fechar$/ }).first().click().catch(() => {});
        await wait(page, 1000);
      } else fail(vp.tag, 'no Filtrar button');
    }

    if (want('filters')) {
      await page.goto(`${BASE}/?zone=jogo&feature=cinema`, { waitUntil: 'domcontentloaded' });
      await wait(page, 9500);
      await shot('home-filter-empty-grid');
      const listBtn = page.locator('[class*="GridListToggle"] button').nth(1);
      if (await listBtn.count()) {
        await listBtn.click();
        await wait(page, 1500);
        await shot('home-filter-empty-list');
        r.checks.emptyList = await page.evaluate(() => document.querySelector('[class*="ListViewWrapper"]')?.innerText.replace(/\n+/g, ' | ').slice(0, 300) ?? null);
      }
      await page.goto(`${BASE}/?zone=web`, { waitUntil: 'domcontentloaded' });
      await wait(page, 9500);
      await shot('home-filter-web');
    }

    if (want('list')) {
      // list view layout + flows. Measures: horizontal overflow, overlapping text boxes, words broken across lines
      // (a single word whose glyphs sit on more than one line), header title/count gap, ellipsized details.
      const openList = async () => {
        await page.locator('[class*="GridListToggle"] button').nth(1).click();
        await wait(page, 1600);
      };
      const measure = () =>
        page.evaluate(() => {
          const wrap = document.querySelector('[class*="ListViewWrapper"]');
          if (!wrap) return null;
          // the list is always in the DOM (hidden with opacity 0 + inert): every check needs it actually open
          const open = /IsOpen/.test(wrap.className) && !wrap.inert && getComputedStyle(wrap).opacity === '1';
          const docOverflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          const wrapOverflowX = wrap.scrollWidth - wrap.clientWidth;
          const broken = [];
          const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const el = node.parentElement;
            if (!el || el.closest('.screen-reader-only')) continue;
            const re = /\S+/g;
            let m;
            while ((m = re.exec(node.textContent))) {
              const r = document.createRange();
              r.setStart(node, m.index);
              r.setEnd(node, m.index + m[0].length);
              const rects = [...r.getClientRects()].filter((x) => x.width > 0.5 && x.height > 0.5);
              if (new Set(rects.map((x) => Math.round(x.top))).size > 1) broken.push(m[0]);
            }
          }
          // glyph boxes (text ranges), not element boxes: padding and optical margins do not count as overlap
          const glyphs = (e) => {
            const r = document.createRange();
            r.selectNodeContents(e);
            return [...r.getClientRects()].filter((x) => x.width > 0.5 && x.height > 0.5);
          };
          const hit = (a, b, m = 1) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > m && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > m;
          const sel = 'h2, h3, [class*="ProjectGroup"] > p, [class*="ProjectTitle"], [class*="Client"], [class*="FeaturesList"] li, [class*="EmptyCta"] a';
          const els = [...new Set(wrap.querySelectorAll(sel))].filter((e) => !e.closest('.screen-reader-only') && getComputedStyle(e).visibility !== 'hidden');
          const boxes = els.map((e) => ({ e, t: (e.textContent || '').trim().slice(0, 40), rs: glyphs(e) })).filter((b) => b.rs.length);
          const overlaps = [];
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i];
              const b = boxes[j];
              if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
              if (a.rs.some((x) => b.rs.some((y) => hit(x, y)))) overlaps.push(`${a.t} × ${b.t}`);
            }
          // fixed site controls drawn over the list (grid/list toggle, sound label, navigation, header buttons). A text
          // counts as under a control when its glyphs come within CLEAR px of the control's box (touching is not clear).
          const CLEAR = 6;
          const controls = [
            ...document.querySelectorAll('[class*="GridListToggle"] button, [class*="Sound"], nav li, header a, header button, [class*="LayoutWrapper"] > button, button[class*="Button"]'),
          ]
            .filter((c) => !wrap.contains(c))
            .map((c) => ({ c, r: c.getBoundingClientRect(), cs: getComputedStyle(c), nav: !!c.closest('nav') }))
            .filter((x) => x.r.width > 1 && x.r.height > 1 && x.cs.visibility !== 'hidden' && +x.cs.opacity > 0.05);
          const grow = (r) => ({ left: r.left - CLEAR, right: r.right + CLEAR, top: r.top - CLEAR, bottom: r.bottom + CLEAR });
          const underControls = [];
          for (const b of boxes)
            for (const x of controls)
              if (b.rs.some((g) => hit(g, grow(x.r), 0)))
                underControls.push({ text: b.t, control: (x.c.textContent || x.c.getAttribute('aria-label') || x.c.tagName).trim().slice(0, 24), bottomNav: x.nav });
          const scrollRange = wrap.scrollHeight - wrap.clientHeight;
          const header = wrap.querySelector('[class*="Header"]');
          const g2 = header?.querySelector('h2') ? glyphs(header.querySelector('h2')) : [];
          const g3 = header?.querySelector('h3') ? glyphs(header.querySelector('h3')) : [];
          let headerGap = null;
          if (g2.length && g3.length) {
            const r2 = { left: Math.min(...g2.map((x) => x.left)), right: Math.max(...g2.map((x) => x.right)), top: Math.min(...g2.map((x) => x.top)), bottom: Math.max(...g2.map((x) => x.bottom)) };
            const r3 = { left: Math.min(...g3.map((x) => x.left)), right: Math.max(...g3.map((x) => x.right)), top: Math.min(...g3.map((x) => x.top)), bottom: Math.max(...g3.map((x) => x.bottom)) };
            const side = r3.left >= r2.right && r3.top < r2.bottom;
            headerGap = side ? { layout: 'side by side', px: Math.round(r3.left - r2.right) } : { layout: 'stacked', px: Math.round(r3.top - r2.bottom) };
          }
          const textLines = (e) => {
            if (!e) return null;
            const r = document.createRange();
            r.selectNodeContents(e);
            return new Set([...r.getClientRects()].filter((x) => x.width > 0.5).map((x) => Math.round(x.top))).size;
          };
          return {
            open,
            docOverflowX,
            wrapOverflowX,
            broken,
            overlaps,
            underControls,
            scrollTop: wrap.scrollTop,
            scrollRange,
            headerGap,
            titleLines: textLines(header?.querySelector('h2')),
            countLines: textLines(header?.querySelector('h3')),
            count: header?.querySelector('h3')?.textContent,
            rows: [...wrap.querySelectorAll('li a')].map((a) => {
              const c = a.querySelector('[class*="Client"]');
              // unrounded widths: the text's own width against the cell's content box (scrollWidth/clientWidth are
              // rounded to whole pixels and miss an ellipsis that cuts less than a pixel)
              let spare = null;
              if (c) {
                const r = document.createRange();
                r.selectNodeContents(c);
                const cs = getComputedStyle(c);
                const box = c.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
                spare = +(box - r.getBoundingClientRect().width).toFixed(2);
              }
              return {
                href: a.getAttribute('href'),
                title: a.querySelector('h3')?.textContent,
                titleLines: textLines(a.querySelector('h3')),
                detail: c?.textContent,
                detailTitleAttr: c?.getAttribute('title'),
                detailSpare: spare,
                detailTruncated: c ? spare < -0.05 : null,
                detailLines: textLines(c),
              };
            }),
            groups: [...wrap.querySelectorAll('[class*="ProjectGroup"] > p')].map((p) => p.textContent),
          };
        });
      const list = (u) => u.map((x) => `${x.text} under ${x.control}`).join(' | ');
      // at rest: no text under (or touching) a fixed control. The bottom navigation floats over the scrolling list by
      // design, so a text under it at rest only fails if scrolling to the end does not bring it out (checked below).
      const assertLayout = (m, label) => {
        if (!m) return fail(vp.tag, `${label}: list not found`);
        if (!m.open) return fail(vp.tag, `${label}: the list is not open`);
        if (m.docOverflowX > 0 || m.wrapOverflowX > 0) fail(vp.tag, `${label}: horizontal overflow ${m.docOverflowX}/${m.wrapOverflowX}px`);
        if (m.broken.length) fail(vp.tag, `${label}: words broken across lines: ${m.broken.join(', ')}`);
        if (m.overlaps.length) fail(vp.tag, `${label}: overlapping text: ${m.overlaps.join(' | ')}`);
        const top = m.underControls.filter((x) => !x.bottomNav);
        if (top.length) fail(vp.tag, `${label}: text under fixed controls: ${list(top)}`);
        if (m.headerGap && m.headerGap.px < (m.headerGap.layout === 'side by side' ? 24 : 4)) fail(vp.tag, `${label}: header title and count only ${m.headerGap.px}px apart (${m.headerGap.layout})`);
        for (const row of m.rows) if (row.detailTruncated && row.detailTitleAttr !== row.detail) fail(vp.tag, `${label}: truncated detail without its full title`);
      };
      // scrolled to the end: the last rows come out from under the bottom navigation; and when everything fit at rest,
      // the extra scroll must not push the heading under the header controls either
      const measureAtEnd = async () => {
        await page.evaluate(() => {
          const w = document.querySelector('[class*="ListViewWrapper"]');
          w.scrollTop = w.scrollHeight;
        });
        await wait(page, 700);
        const m = await measure();
        await page.evaluate(() => {
          document.querySelector('[class*="ListViewWrapper"]').scrollTop = 0;
        });
        await wait(page, 500);
        return m;
      };
      const assertAtEnd = (rest, end, label) => {
        if (!end) return fail(vp.tag, `${label} (scrolled to the end): list not found`);
        if (!end.open) return fail(vp.tag, `${label} (scrolled to the end): the list is not open`);
        const nav = end.underControls.filter((x) => x.bottomNav);
        if (nav.length) fail(vp.tag, `${label} (scrolled to the end): text still under the bottom navigation: ${list(nav)}`);
        if (rest && !rest.underControls.length && end.underControls.length)
          fail(vp.tag, `${label}: the list fits on screen, yet scrolling it ${end.scrollTop}px puts text under fixed controls: ${list(end.underControls)}`);
      };
      // full list
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await wait(page, 9500);
      await openList();
      await shot('list');
      const full = await measure();
      r.checks.list = full;
      assertLayout(full, 'list');
      const fullEnd = await measureAtEnd();
      r.checks.listAtEnd = fullEnd && { scrollTop: fullEnd.scrollTop, scrollRange: fullEnd.scrollRange, underControls: fullEnd.underControls };
      assertAtEnd(full, fullEnd, 'list');
      if (full && !/1 projeto publicado/.test(full.count || '')) fail(vp.tag, `list count "${full.count}"`);
      if (!full || full.rows.length !== 2) fail(vp.tag, `list rows ${full?.rows.length}`);
      // links of both projects (and back to the list)
      for (const [title, dest] of [
        ['Filmes HD Online Grátis', '/projects/filmes-hd-online-gratis'],
        ['Veil', '/projects/veil'],
      ]) {
        await page.locator('li a', { has: page.locator('h3', { hasText: title }) }).first().click();
        await wait(page, 2600);
        const got = new URL(page.url()).pathname;
        (r.checks.listLinks ||= []).push(`${title}→${got}`);
        if (got !== dest) fail(vp.tag, `list link ${title} went to ${got}`);
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
        await wait(page, 9500);
        await openList();
      }
      // filter through the panel (Web), then "Todos"
      const panel = async (item) => {
        await page.locator('button', { hasText: /^Filtrar$/ }).first().click();
        await wait(page, 1300);
        await page.locator('#work-grid-filters-overlay button', { hasText: new RegExp('^' + item + '$') }).first().click();
        await wait(page, 1500);
        await page.locator('button', { hasText: /^Fechar$/ }).first().click();
        await wait(page, 1200);
      };
      await panel('Web');
      await shot('list-filter-web');
      const web = await measure();
      r.checks.listFilterWeb = { url: page.url().replace(BASE, ''), count: web?.count, rows: web?.rows.map((x) => x.title) };
      assertLayout(web, 'list ?zone=web');
      if (!web || web.rows.length !== 1 || web.rows[0].title !== 'Filmes HD Online Grátis') fail(vp.tag, 'filter Web did not leave only the published project');
      await panel('Todos');
      const back = await measure();
      r.checks.listAfterTodos = { url: page.url().replace(BASE, ''), count: back?.count, rows: back?.rows.length };
      if (!back || !back.open || back.rows.length !== 2 || new URL(page.url()).search) fail(vp.tag, '"Todos" did not restore the full list');
      // in-development only (URL parameter), then the empty state and "Ver todos os projetos"
      await page.goto(`${BASE}/?zone=jogo`, { waitUntil: 'domcontentloaded' });
      await wait(page, 9500);
      await openList();
      await shot('list-filter-jogo');
      const jogo = await measure();
      r.checks.listFilterJogo = { count: jogo?.count, rows: jogo?.rows.map((x) => x.title), groups: jogo?.groups };
      assertLayout(jogo, 'list ?zone=jogo');
      assertAtEnd(jogo, await measureAtEnd(), 'list ?zone=jogo');
      if (!jogo || jogo.rows.length !== 1 || jogo.rows[0].title !== 'Veil') fail(vp.tag, 'zone=jogo did not leave only Veil');
      await page.goto(`${BASE}/?zone=jogo&feature=cinema`, { waitUntil: 'domcontentloaded' });
      await wait(page, 9500);
      await openList();
      await shot('list-empty');
      const empty = await measure();
      r.checks.listEmpty = { count: empty?.count, groups: empty?.groups };
      assertLayout(empty, 'list empty state');
      assertAtEnd(empty, await measureAtEnd(), 'list empty state');
      await page.locator('a', { hasText: /Ver todos os projetos/i }).first().click();
      await wait(page, 3000);
      const restored = await measure();
      r.checks.listEmptyRestored = { url: page.url().replace(BASE, ''), count: restored?.count, rows: restored?.rows.length };
      if (!restored || !restored.open || restored.rows.length !== 2 || new URL(page.url()).search) fail(vp.tag, '"Ver todos os projetos" did not restore the full list');
    }

    if (want('case')) {
      await page.goto(`${BASE}/projects/filmes-hd-online-gratis`, { waitUntil: 'networkidle' });
      await wait(page, 2500);
      await shot('case-top');
      r.checks.caseTitle = await page.title();
      r.checks.caseLive = await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')].map((a) => `${a.textContent?.trim()}→${a.getAttribute('href')}`));
      const H = await page.evaluate(() => document.documentElement.scrollHeight);
      for (const f of [0.2, 0.4, 0.6, 0.8, 0.98]) {
        await page.evaluate((y) => window.scrollTo(0, y), Math.round(H * f));
        await wait(page, 1600);
        await shot(`case-${Math.round(f * 100)}`);
      }
      r.checks.caseText = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 1600));
    }

    if (want('veil')) {
      await page.goto(`${BASE}/projects/veil`, { waitUntil: 'networkidle' });
      await wait(page, 2500);
      await shot('veil-top');
      r.checks.veilTitle = await page.title();
      r.checks.veilLinks = await page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')].map((a) => a.getAttribute('href')));
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await wait(page, 1600);
      await shot('veil-bottom');
      r.checks.veilText = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 900));
    }

    if (want('about')) {
      for (const uid of ['studio', 'process']) {
        await page.goto(`${BASE}/about/${uid}`, { waitUntil: 'networkidle' });
        await wait(page, 3000);
        await shot(`about-${uid}-top`);
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        let i = 0;
        for (let y = vp.height; y < H; y += Math.round(vp.height * 0.9)) {
          await page.evaluate((yy) => window.scrollTo(0, yy), y);
          await wait(page, 1200);
          if (i % 2 === 0 || y + vp.height >= H) await shot(`about-${uid}-${String(i).padStart(2, '0')}`);
          i++;
        }
        r.checks[`about_${uid}`] = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 2500));
      }
    }

    if (want('contact')) {
      await page.goto(`${BASE}/about/studio`, { waitUntil: 'networkidle' });
      await wait(page, 2000);
      const nav = page.locator('nav a', { hasText: 'Contato' }).first();
      if (await nav.count()) await nav.click();
      else await page.goto(`${BASE}/contact`);
      await wait(page, 3200);
      await shot('contact-step1');
      r.checks.contactUrl = new URL(page.url()).pathname;
      r.checks.contactText = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(-900));
      r.checks.contactLinks = await page.evaluate(() => [...document.querySelectorAll('a[href^="mailto:"], a[href*="linkedin"]')].map((a) => a.getAttribute('href')));
      // step 2: fill and submit (POST to the local /api/contact, no external destination); expect the visible error
      const first = page.locator('button', { hasText: 'Projetos e parcerias' }).first();
      if (await first.count()) {
        await first.click();
        await wait(page, 1500);
        await page.locator('input[name="name"]').fill('João da Conceição');
        await page.locator('input[name="email"]').fill('teste@example.com');
        await page.locator('input[name="company"]').fill('Teste');
        await shot('contact-step2');
        await page.locator('form button', { hasText: 'Enviar' }).first().click();
        await wait(page, 2500);
        await shot('contact-submit');
        r.checks.contactSubmit = await page.evaluate(() => document.querySelector('[role="alert"]')?.textContent ?? null);
        r.checks.contactNameError = await page.evaluate(() => document.querySelector('#error-name')?.textContent ?? null);
      }
    }

    if (want('misc')) {
      for (const u of ['/projects/alter-ego', '/careers', '/about/agency']) {
        const res = await page.goto(`${BASE}${u}`, { waitUntil: 'networkidle' });
        await wait(page, 1500);
        r.checks[`status ${u}`] = res?.status();
        if (u === '/projects/alter-ego') await shot('notfound');
      }
      r.checks.notFoundTitle = await page.title();
      await page.goto(`${BASE}/privacy-policy`, { waitUntil: 'networkidle' });
      await wait(page, 2000);
      await shot('privacy-top');
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await wait(page, 1500);
      await shot('privacy-bottom-footer');
      r.checks.head = await page.evaluate(() => ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content,
        og: [...document.querySelectorAll('meta[property^="og:"]')].map((m) => `${m.getAttribute('property')}=${m.content}`),
        icons: [...document.querySelectorAll('link[rel*="icon"], link[rel="manifest"]')].map((l) => `${l.rel} ${l.getAttribute('href')}`),
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent.slice(0, 400)),
      }));
    }
    await settle();
    await ctx.close();
  }
  report.complete = true;
} catch (err) {
  // a run that stops part-way still writes its report, marked incomplete and failed (the captures it did take keep
  // their own build ids; report.build still says which build they came from)
  report.aborted = String(err?.stack || err).slice(0, 2000);
  report.failures.push(`run aborted: ${String(err?.message || err).slice(0, 300)}`);
} finally {
  await settle().catch(() => {});
  await browser.close().catch(() => {});
  report.finishedAt = new Date().toISOString();
  const checks = [...staticChecks.values()];
  const mismatched = [...staticChecks.entries()].filter(([, v]) => v.local && !v.match).map(([k]) => k);
  const missing = [...staticChecks.entries()].filter(([, v]) => !v.local).map(([k]) => k);
  const unread = [...unreadable].filter((k) => !staticChecks.has(k));
  const failed = Object.fromEntries(staticFailed);
  const pageIds = [...flightIds.keys()].filter(Boolean);
  const seenIds = new Set([...responseIds.document.keys(), ...responseIds.rsc.keys()]);
  // the local build must be the same at the end of the run as at the start (no rebuild while the run was going)
  const endBuild = readBuildId();
  const unchanged = endBuild.id === LOCAL_BUILD_ID && endBuild.modified === LOCAL_BUILD.modified;
  const verified =
    !!LOCAL_BUILD_ID &&
    unchanged &&
    checks.length > 0 &&
    !mismatched.length &&
    !missing.length &&
    !unread.length &&
    !Object.keys(failed).length &&
    !flightIds.has(null) &&
    pageIds.length === 1 &&
    pageIds[0] === LOCAL_BUILD_ID &&
    seenIds.size === 1 &&
    seenIds.has(LOCAL_BUILD_ID);
  report.build = {
    verifiedAt: report.finishedAt,
    result: verified ? 'verified' : 'NOT verified',
    localBuildId: LOCAL_BUILD_ID,
    localBuildIdFile: `${DIST}/BUILD_ID`,
    localBuildIdModified: LOCAL_BUILD.modified,
    localBuildAtEnd: endBuild,
    pageBuildIds: Object.fromEntries([...flightIds.entries()].map(([k, v]) => [String(k), v])),
    responseBuildIds: {
      document: Object.fromEntries(responseIds.document),
      rsc: Object.fromEntries(responseIds.rsc),
    },
    staticFiles: {
      loaded: checks.length + unread.length,
      identical: checks.filter((c) => c.match).length,
      mismatched,
      missingLocally: missing,
      unreadable: unread,
      failed,
      cancelledByNavigation: [...staticAborted].filter((k) => !staticChecks.has(k)),
      // every file the browser loaded, with the SHA-256 of the body it received and of the local file
      files: [...staticChecks.entries()].map(([p, v]) => ({ path: p, sha256: v.served, localSha256: v.local, identical: v.match })).sort((a, b) => a.path.localeCompare(b.path)),
    },
    method:
      'SHA-256 of every /_next/static/** response body vs <dist>/static/<same path> (any 4xx/5xx or failed static request fails); flight "b" field of the HTML document of every capture, and of every RSC response, vs <dist>/BUILD_ID, read at the start and again at the end of the run',
  };
  if (!verified)
    report.failures.push(
      `build: ${report.build.result} (local ${LOCAL_BUILD_ID}${unchanged ? '' : `, changed during the run to ${endBuild.id} ${endBuild.modified}`}, pages ${JSON.stringify(report.build.pageBuildIds)}, responses ${JSON.stringify(report.build.responseBuildIds)}, static ${checks.length} read, ${mismatched.length} mismatched, ${missing.length} missing, ${unread.length} unreadable, ${Object.keys(failed).length} failed)`,
    );
  process.exitCode = report.failures.length ? 1 : 0;
  console.log(
    'build:',
    report.build.result,
    LOCAL_BUILD_ID,
    'static files',
    report.build.staticFiles.loaded,
    'identical',
    report.build.staticFiles.identical,
    'captures by document id',
    JSON.stringify(report.build.pageBuildIds),
    'responses',
    JSON.stringify(report.build.responseBuildIds),
  );

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('report:', path.join(OUT, 'report.json'), 'failures:', report.failures.length);
}
