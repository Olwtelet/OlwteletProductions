// Contact step-one cards: hover (pointer), keyboard focus and a real tap (touch contexts), at every width; 768 px both
// with touch and with a mouse. For each card with an image: the image box must lie inside the card and clear of the
// title glyphs, the eyebrow and the arrow; opacity on/off; after a tap, the card's background.
//   node contact-hover.mjs <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const res = {};
for (const [tag, w, h, touch] of [
  ['m390', 390, 844, true],
  ['t768', 768, 1024, true],
  ['t768h', 768, 1024, false], // a 768 px window with a mouse: the 768–1023 px framing on hover and keyboard focus
  ['d1024', 1024, 768, false],
  ['d1280', 1280, 800, false],
  ['d1440', 1440, 900, false],
  ['d1920', 1920, 1080, false],
  ['w2560', 2560, 1440, false],
]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch })).newPage();
  await p.goto('http://localhost:3000/contact', { waitUntil: 'networkidle' });
  await p.waitForTimeout(3500);
  const geo = () =>
    p.evaluate(() =>
      [...document.querySelectorAll('[class*="ContactGridTile"]')].map((t) => {
        const R = (e) => e && e.getBoundingClientRect();
        const card = R(t);
        const media = t.querySelector('[class*="TileMedia"]');
        const m = R(media);
        const title = t.querySelector('h2');
        const r = document.createRange();
        r.selectNodeContents(title);
        const g = [...r.getClientRects()];
        const arrow = R(t.querySelector('[class*="ArrowButtonContainer"]'));
        const eyebrow = R(t.querySelector('p'));
        const hit = (a, c) => a && c && Math.min(a.right, c.right) - Math.max(a.left, c.left) > 0 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 0;
        const img = media?.querySelector('img');
        return {
          eyebrow: t.querySelector('p')?.textContent.trim().slice(0, 20),
          hasMedia: !!media,
          display: media ? getComputedStyle(media).display : null,
          opacity: media ? +getComputedStyle(media).opacity : null,
          filter: media ? getComputedStyle(media).filter : null,
          inside: m ? m.left >= card.left - 0.5 && m.right <= card.right + 0.5 && m.top >= card.top - 0.5 && m.bottom <= card.bottom + 0.5 : null,
          underTitle: m ? g.some((x) => hit(x, m)) : null,
          underArrow: m ? hit(arrow, m) : null,
          underEyebrow: m ? hit(eyebrow, m) : null,
          media: m && m.width ? [m.left - card.left, m.top - card.top, m.width, m.height].map(Math.round) : null,
          card: [card.width, card.height].map(Math.round),
          imgLoaded: img ? img.complete && img.naturalWidth > 0 : null,
        };
      }),
    );
  // the visible state of a card: its inner tile and its arrow (the wrapper button / link stays transparent)
  const look = (loc) =>
    loc.evaluate((e) => {
      const tile = e.matches('[class*="ContactGridTile"]') ? e : e.querySelector('[class*="ContactGridTile"]');
      const arrow = e.querySelector('[class*="ArrowButtonContainer"]');
      return { tile: tile ? getComputedStyle(tile).backgroundColor : null, arrow: arrow ? getComputedStyle(arrow).backgroundColor : null };
    });
  const contactTiles = p.locator('[class*="TileContact"]');
  const tileColors = () => contactTiles.evaluateAll((els) => els.map((e) => `${e.getAttribute('aria-label')}: ${getComputedStyle(e).backgroundColor}`));
  const r = { rest: await geo() };
  const cards = [p.locator('[class*="ContactGrid"] > button').first(), p.locator('[class*="ContactGrid"] > a').first()];
  r.restLook = [await look(cards[0]), await look(cards[1])];
  r.restTiles = await tileColors();
  // touch: a real tap on each card must not show the image or leave the card inverted. The cards' own action (step 2,
  // the Veil link) is cancelled for the test so the same step stays on screen to be measured.
  if (touch)
    await p.evaluate(() =>
      document.addEventListener(
        'click',
        (e) => {
          if (e.target.closest?.('[class*="ContactGrid"] > a, [class*="ContactGrid"] > button, [class*="TileContact"]')) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        },
        true,
      ),
    );
  for (let i = 0; i < 2; i++) {
    const box = await cards[i].boundingBox();
    const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
    if (touch) await p.touchscreen.tap(cx, cy);
    else await p.mouse.move(cx, cy);
    await p.waitForTimeout(700);
    const k = touch ? `tap${i + 1}` : `hover${i + 1}`;
    r[k] = await geo();
    r[`${k}Look`] = await look(cards[i]);
    await p.screenshot({ path: path.join(OUT, `${tag}-contact-${touch ? 'tap' : 'hover'}-card${i + 1}.png`) });
    if (!touch) {
      await p.mouse.move(5, 5);
      await p.waitForTimeout(700);
      r[`out${i + 1}`] = (await geo()).map((x) => x.opacity);
    }
  }
  // touch: the e-mail and LinkedIn cards (their action is cancelled the same way) must not stay inverted after a tap
  if (touch) {
    const n = await contactTiles.count();
    for (let j = 0; j < n; j++) {
      const bx = await contactTiles.nth(j).boundingBox();
      if (bx) await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2);
      await p.waitForTimeout(500);
    }
    r.tilesAfterTaps = await tileColors();
  }
  // keyboard: focus each card (focus-visible mirrors hover); Shift+Tab then Tab, so the focus comes from the keyboard
  if (!touch)
    for (let i = 0; i < 2; i++) {
      await cards[i].focus();
      await p.keyboard.press('Shift+Tab');
      await p.keyboard.press('Tab');
      await p.waitForTimeout(700);
      r[`focus${i + 1}`] = (await geo()).map((x) => x.opacity);
      r[`focus${i + 1}Look`] = await look(cards[i]);
      await p.screenshot({ path: path.join(OUT, `${tag}-contact-focus-card${i + 1}.png`) });
    }
  res[tag] = r;
  console.log(tag, JSON.stringify(r).slice(0, 900));
  await p.context().close();
}
await b.close();
fs.writeFileSync(path.join(OUT, 'contact-hover.json'), JSON.stringify(res, null, 2));
