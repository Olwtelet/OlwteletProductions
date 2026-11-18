// Records the states the owner reported, on the build being served (GET to localhost only).
//   node owner-states.mjs <outDir> [sections: cta,sound,process,studio,contact,modal,grid]
// Audio is observed with an init script that only wraps AudioContext / AudioBufferSourceNode.start to count them
// (no behaviour change). Videos: Playwright recordVideo (webm).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const OUT = path.resolve(process.argv[2]);
const ONLY = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3].split(',') : null;
// --pin-high (test only): keeps the grid videos on the HIGH graphics tier when another program loads the GPU (see grid-flicker.mjs)
const PIN_HIGH = process.argv.includes('--pin-high');
const want = (s) => !ONLY || ONLY.includes(s);
fs.mkdirSync(OUT, { recursive: true });
const log = {};
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const VPS = {
  m390: [390, 844, true],
  t768: [768, 1024, false],
  d1440: [1440, 900, false],
  d1920: [1920, 1080, false],
  w2560: [2560, 1440, false],
};
const AUDIO_PROBE = () => {
  const w = window;
  w.__audio = { contexts: 0, started: 0, states: [] };
  const AC = w.AudioContext;
  if (AC) {
    w.AudioContext = class extends AC {
      constructor(...a) {
        super(...a);
        w.__audio.contexts++;
        w.__audio.last = this;
        this.addEventListener('statechange', () => w.__audio.states.push(this.state));
      }
    };
  }
  const start = AudioBufferSourceNode.prototype.start;
  w.__audio.loops = new Set();
  AudioBufferSourceNode.prototype.start = function (...a) {
    w.__audio.started++;
    // background tracks are the long buffers (≥ 20 s); count the ones playing
    if (this.buffer && this.buffer.duration >= 20) {
      w.__audio.loops.add(this);
      this.addEventListener('ended', () => w.__audio.loops.delete(this));
    }
    return start.apply(this, a);
  };
  // effective output: an analyser tapped wherever a node connects to the destination (automatic-pull node)
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode && !w.__audio.analyser) {
      const an = this.context.createAnalyser();
      an.fftSize = 2048;
      connect.call(this, an);
      w.__audio.analyser = an;
    }
    return connect.call(this, dest, ...rest);
  };
  w.__audio.rms = () => {
    const an = w.__audio.analyser;
    if (!an) return null;
    const d = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(d);
    let s = 0;
    for (const v of d) s += v * v;
    return Math.sqrt(s / d.length);
  };
};
async function ctxFor(tag, opts = {}) {
  const [w, h, m] = VPS[tag] || opts.size;
  const ctx = await b.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: opts.dpr || 1,
    isMobile: m,
    hasTouch: m,
    locale: 'pt-BR',
    recordVideo: opts.video ? { dir: path.join(OUT, 'video-tmp'), size: { width: w, height: h } } : undefined,
  });
  await ctx.addInitScript(AUDIO_PROBE);
  return ctx;
}
const audioState = async (p) => {
  // RMS sampled 5 times over 0.5 s (the loop has quiet passages)
  let rms = 0;
  for (let i = 0; i < 5; i++) {
    rms = Math.max(rms, (await p.evaluate(() => window.__audio.rms?.() ?? 0)) || 0);
    await p.waitForTimeout(100);
  }
  return p.evaluate((rmsMax) => {
    const a = window.__audio;
    const label = [...document.querySelectorAll('[class*="SoundLabel"]')].map((e) => e.textContent.trim()).find((t) => /som/i.test(t)) || null;
    let pref = null;
    try {
      pref = localStorage.getItem('olwtelet:sound');
    } catch {}
    return { contexts: a.contexts, started: a.started, activeLoops: a.loops.size, state: a.last?.state ?? null, rms: +rmsMax.toFixed(4), audible: rmsMax > 0.001, label, pref, url: location.pathname };
  }, rms);
};
const save = (k, v) => {
  log[k] = v;
  fs.writeFileSync(path.join(OUT, 'states.json'), JSON.stringify(log, null, 2));
};
async function finishVideo(ctx, page, name) {
  const v = page.video();
  await ctx.close();
  if (v) {
    const src = await v.path();
    fs.renameSync(src, path.join(OUT, name + '.webm'));
  }
}

try {
  // ------------------------------------------------------------ 1. project CTA (Veil and Filmes)
  if (want('cta'))
    for (const tag of Object.keys(VPS))
      for (const uid of ['veil', 'filmes-hd-online-gratis']) {
        const ctx = await ctxFor(tag);
        const p = await ctx.newPage();
        await p.goto(`${BASE}/projects/${uid}`, { waitUntil: 'networkidle' });
        await p.waitForTimeout(2500);
        const cta = p.locator('[class*="SimilarProjectsAllWorkCta"]').first();
        if (await cta.count()) {
          await cta.scrollIntoViewIfNeeded();
          await p.waitForTimeout(1800);
          await p.screenshot({ path: path.join(OUT, `${tag}-${uid}-cta.png`) });
          save(`${tag}-${uid}-cta`, await cta.evaluate((a) => {
            const s = a.querySelector('span');
            const r = document.createRange();
            r.selectNodeContents(s);
            const tr = r.getBoundingClientRect();
            const ar = a.getBoundingClientRect();
            const cs = getComputedStyle(s);
            return { text: s.textContent, fontSize: cs.fontSize, whiteSpace: cs.whiteSpace, box: [ar.left, ar.right].map(Math.round), textBox: [tr.left, tr.right].map(Math.round), cutPx: Math.round(tr.right - ar.right), lines: new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size };
          }));
        }
        // Veil: the whole page at 6 scroll positions (other cuts)
        if (uid === 'veil' && (tag === 'd1440' || tag === 'm390' || tag === 'w2560')) {
          const H = await p.evaluate(() => document.documentElement.scrollHeight);
          for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
            await p.evaluate((y) => window.scrollTo(0, y), Math.round((H - 900) * f));
            await p.waitForTimeout(1300);
            await p.screenshot({ path: path.join(OUT, `${tag}-veil-scroll-${Math.round(f * 100)}.png`) });
          }
        }
        await ctx.close();
      }

  // ------------------------------------------------------------ 2. sound: first visit, interaction, navigation
  if (want('sound')) {
    const ctx = await ctxFor('d1440', { video: true });
    const p = await ctx.newPage();
    const steps = [];
    const rec = async (label) => {
      steps.push([label, await audioState(p)]);
      save('sound', steps);
    };
    const toggle = async () => {
      await p.locator('[class*="Sound"][role="button"], [class*="Sound"]:has([class*="SoundLabel"])').first().click();
      await p.waitForTimeout(1200);
    };
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(10500);
    await rec('first visit, no click (no saved choice)');
    // a click on an empty grid cell: a plain user activation, not the sound control
    await p.mouse.click(Math.round(1440 * 0.2), Math.round(900 * 0.75));
    await p.waitForTimeout(3000);
    await rec('after the first click on the page');
    await p.locator('nav a', { hasText: 'Sobre' }).first().click();
    await p.waitForTimeout(4000);
    await rec('navigated to Sobre (client navigation)');
    await p.locator('nav a', { hasText: 'Projetos' }).first().click();
    await p.waitForTimeout(4000);
    await rec('navigated back to Projetos');
    await toggle();
    await rec('turned OFF with the Sound control');
    await p.locator('nav a', { hasText: 'Sobre' }).first().click();
    await p.waitForTimeout(4000);
    await rec('navigated to Sobre after OFF');
    await p.mouse.click(700, 450);
    await p.waitForTimeout(1500);
    await rec('clicked on the page after OFF');
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4500);
    await p.mouse.click(700, 450);
    await p.waitForTimeout(1500);
    await rec('reloaded (saved OFF) and clicked');
    await toggle();
    await rec('turned ON again');
    await p.keyboard.press('Tab');
    await p.locator('[class*="Sound"][role="button"]').first().focus().catch(() => {});
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1200);
    await rec('keyboard Enter on the Sound control (OFF)');
    await p.keyboard.press('Enter');
    await p.waitForTimeout(1500);
    await rec('keyboard Enter again (ON)');
    save('sound', steps);
    await finishVideo(ctx, p, 'd1440-sound-flow');
  }

  // ------------------------------------------------------------ 3. Processo and Estúdio (reference)
  for (const [sec, uid] of [
    ['process', 'process'],
    ['studio', 'studio'],
  ])
    if (want(sec))
      for (const tag of ['m390', 't768', 'd1440', 'w2560']) {
        const ctx = await ctxFor(tag);
        const p = await ctx.newPage();
        await p.goto(`${BASE}/about/${uid}`, { waitUntil: 'networkidle' });
        await p.waitForTimeout(3000);
        const H = await p.evaluate(() => document.documentElement.scrollHeight);
        const vh = VPS[tag][1];
        const n = Math.min(14, Math.ceil(H / vh));
        for (let i = 0; i < n; i++) {
          await p.evaluate((y) => window.scrollTo(0, y), i * vh);
          await p.waitForTimeout(1100);
          await p.screenshot({ path: path.join(OUT, `${tag}-${uid}-${String(i).padStart(2, '0')}.png`) });
        }
        save(`${tag}-${uid}-structure`, await p.evaluate(() => {
          const main = document.querySelector('main') || document.body;
          const els = [...main.querySelectorAll('h1,h2,h3,p,img,video,canvas,li')].filter((e) => e.getBoundingClientRect().width > 0);
          return {
            height: document.documentElement.scrollHeight,
            text: main.innerText.replace(/\s+/g, ' ').slice(0, 6000),
            elements: els.map((e) => {
              const r = e.getBoundingClientRect();
              return `${e.tagName} ${Math.round(r.left)},${Math.round(r.top + scrollY)} ${Math.round(r.width)}x${Math.round(r.height)} ${(e.textContent || e.getAttribute('src') || '').trim().slice(0, 30)}`;
            }),
          };
        }));
        await ctx.close();
      }

  // ------------------------------------------------------------ 4. contact cards on hover
  if (want('contact'))
    for (const tag of Object.keys(VPS)) {
      const ctx = await ctxFor(tag);
      const p = await ctx.newPage();
      await p.goto(BASE + '/contact', { waitUntil: 'networkidle' });
      await p.waitForTimeout(3500);
      await p.screenshot({ path: path.join(OUT, `${tag}-contact-rest.png`) });
      const cards = p.locator('[class*="ContactGrid"] > *');
      const n = await cards.count();
      for (let i = 0; i < n; i++) {
        const box = await cards.nth(i).boundingBox();
        if (!box) continue;
        if (VPS[tag][2]) {
          await p.touchscreen.tap(box.x + box.width / 2, box.y + 12).catch(() => {});
        } else await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await p.waitForTimeout(1200);
        await p.screenshot({ path: path.join(OUT, `${tag}-contact-hover-${i + 1}.png`) });
        if (VPS[tag][2]) {
          await p.goto(BASE + '/contact', { waitUntil: 'networkidle' });
          await p.waitForTimeout(3000);
        }
      }
      await p.mouse.move(5, 5);
      await ctx.close();
    }

  // ------------------------------------------------------------ 5. modal lifecycle (video)
  if (want('modal')) {
    const ctx = await ctxFor('d1440', { video: true });
    const p = await ctx.newPage();
    const state = () =>
      p.evaluate(() => {
        const d = document.querySelector('dialog');
        const cx = innerWidth / 2;
        const cy = innerHeight / 2;
        const top = document.elementFromPoint(cx, cy);
        return { url: location.pathname, dialogOpen: d ? d.open : null, dialogOpacity: d ? getComputedStyle(d).opacity : null, topAtCenter: top ? `${top.tagName}.${String(top.className).slice(0, 40)}` : null, bodyOverflow: document.body.style.overflow, htmlClass: document.documentElement.className.slice(0, 80) };
      });
    const steps = [];
    const step = async (label, fn) => { try { await fn(); } catch (e) { steps.push([label + ' FAILED', String(e).slice(0, 300)]); save('modal', steps); } };
    const x = p.locator('button[aria-label="Fechar contato"]');
    const rec = async (label, extra = {}) => {
      steps.push([label, { ...(await state()), scrollY: await p.evaluate(() => scrollY), ...extra }]);
      save('modal', steps);
    };
    const openContact = async (via) => {
      if (via === 'header') await p.locator('header a', { hasText: /conversar/i }).first().click();
      else await p.locator('nav a', { hasText: 'Contato' }).first().click();
      await p.waitForTimeout(2500);
    };
    await step('home', async () => {
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(10000);
    });
    await step('open from home', async () => {
      await openContact('header');
      await rec('opened from home');
    });
    await step('privacy', async () => {
      await p.locator('a[href="/privacy-policy"]:visible').first().click({ force: true });
      await p.waitForTimeout(2500);
      await rec('clicked privacy');
      await p.screenshot({ path: path.join(OUT, 'd1440-modal-after-privacy.png') });
    });
    await step('X after privacy', async () => {
      // fixed: the privacy link closes the modal, so there is no X left to press; the page itself must take clicks
      if (!(await x.count())) {
        await rec('X after privacy: not applicable (dialog closed, no X on the page)', { topAtNav: await p.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight - 40); return e ? `${e.tagName}.${String(e.className).slice(0, 40)}` : null; }) });
        return;
      }
      await x.click({ force: true, timeout: 3000 });
      await p.waitForTimeout(2500);
      await rec('clicked X after privacy');
      await p.screenshot({ path: path.join(OUT, 'd1440-modal-after-x.png') });
      // can the page underneath be clicked? (an invisible layer would swallow it)
      await rec('click-through probe', { topAtNav: await p.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight - 40); return e ? `${e.tagName}.${String(e.className).slice(0, 40)}` : null; }) });
    });
    await step('escape', async () => {
      await p.goto(BASE + '/about/studio', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3000);
      await p.mouse.wheel(0, 900);
      await p.waitForTimeout(1500);
      await rec('studio scrolled before opening');
      await openContact('nav');
      await rec('opened over studio');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(2500);
      await rec('Escape');
    });
    await step('reopen + X twice', async () => {
      await openContact('nav');
      await rec('reopened');
      await x.click({ force: true, timeout: 3000 }).catch(() => {});
      await x.click({ force: true, timeout: 1000 }).catch(() => {});
      await p.waitForTimeout(2500);
      await rec('X twice');
    });
    await step('back/forward', async () => {
      await openContact('nav');
      await rec('opened again');
      await p.goBack();
      await p.waitForTimeout(2500);
      await rec('browser Back');
      await p.goForward();
      await p.waitForTimeout(2500);
      await rec('browser Forward');
    });
    await step('enter inside the modal over home', async () => {
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(10000);
      await openContact('header');
      await p.keyboard.press('Tab');
      await p.keyboard.press('Tab');
      await p.keyboard.press('Enter');
      await p.waitForTimeout(2500);
      await rec('Tab, Tab, Enter inside the modal over home');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(2500);
      await rec('Escape after that');
    });
    await step('direct', async () => {
      await p.goto(BASE + '/contact', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(3000);
      await rec('direct /contact');
      await x.click({ force: true, timeout: 3000 });
      await p.waitForTimeout(2500);
      await rec('direct then X');
    });
    save('modal', steps);
    await finishVideo(ctx, p, 'd1440-modal-flow');
  }

  // ------------------------------------------------------------ 6. grid lines in motion (video, DPR 1 and 2)
  if (want('grid'))
    for (const [tag, dpr] of [
      ['d1440', 1],
      ['d1440', 2],
      ['w2560', 1],
      ['m390', 2],
    ]) {
      const ctx = await ctxFor(tag, { video: true, dpr });
      if (PIN_HIGH) await ctx.addInitScript(() => { window.__WG_DEBUG__ = true; });
      const p = await ctx.newPage();
      await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(10000);
      const tiers = { declinedBeforeDrag: null, repins: 0 };
      let pinTimer = null;
      if (PIN_HIGH) {
        tiers.declinedBeforeDrag = await p.evaluate(() => window.__wgStore?.get?.().graphicsTier === 1);
        // put HIGH back every 100 ms during the recording (the monitor re-evaluates every 2.5 s)
        const tick = async () => { try { tiers.repins += await p.evaluate(() => { const s = window.__wgStore; if (s && s.get().graphicsTier !== 0) { s.set({ graphicsTier: 0 }); return 1; } return 0; }); } catch {} };
        await tick();
        pinTimer = setInterval(tick, 100);
        await p.waitForTimeout(600);
      }
      const [w, h] = VPS[tag];
      const cx = w / 2;
      const cy = h / 2;
      const drag = async (dx, dy, ms, steps) => {
        if (VPS[tag][2]) {
          // touch drag through CDP-free path: dispatch pointer events via mouse (Playwright maps to touch-like pointer)
        }
        await p.mouse.move(cx, cy);
        await p.mouse.down();
        for (let i = 1; i <= steps; i++) {
          await p.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps);
          await p.waitForTimeout(ms / steps);
        }
        await p.mouse.up();
      };
      await drag(-420, -160, 4000, 80); // slow
      await p.waitForTimeout(1800); // inertia after release
      await drag(520, 260, 260, 6); // fast
      await p.waitForTimeout(2500);
      if (pinTimer) clearInterval(pinTimer);
      save(`grid-${tag}-dpr${dpr}`, { pinHigh: PIN_HIGH, ...tiers, tierAtEnd: await p.evaluate(() => window.__wgStore?.get?.().graphicsTier ?? null) });
      await finishVideo(ctx, p, `${tag}-dpr${dpr}-grid-drag`);
    }
} finally {
  await b.close();
  try { fs.rmSync(path.join(OUT, 'video-tmp'), { recursive: true, force: true }); } catch {}
  console.log('done', OUT);
}
