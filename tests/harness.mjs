// Shared helpers for the browser tests. The tests load the built templates from dist/ (the same
// text that goes into Anki) in a real browser, with the card's placeholders filled in.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { buildCard } from '../scripts/build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

export const DECK = 'Law::Land';
export const QUESTION = 'What is consideration in contract law?';
export const ANSWER = 'Something of value given in exchange for a promise.';

// Anki renders {{cloze:Text}} as a span: "[...]" on the question side, the hidden words on the answer
// side. `cloze` is the list of hidden words (one per blank).
function fill(html, deck, side, cloze, extra) {
  const spans = cloze.map((word) =>
    side === 'front.html'
      ? `<span class="cloze" data-cloze="${word}" data-ordinal="1">[...]</span>`
      : `<span class="cloze" data-ordinal="1">${word}</span>`,
  );
  return html
    .replace('{{Deck}}', deck)
    .replace('{{Front}}', QUESTION)
    .replace('{{Back}}', ANSWER)
    .replace('{{cloze:Text}}', () => `A ${spans[0]} is ${spans[1] ?? 'something'} in law.`)
    .replace('{{Back Extra}}', extra);
}

export async function startPages({
  deck = DECK,
  variant = 'basic',
  cloze = ['x'],
  extra = '',
} = {}) {
  const css = readFileSync(root + 'card/style.css', 'utf8');
  const built = buildCard(variant);
  const wrap = (html, side) =>
    `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>html,body{margin:0}${css.replace(/@import[^;]+;/, '')}</style></head><body><div class="card">${fill(html, deck, side, cloze, extra)}</div></body></html>`;
  const pages = {
    '/front.html': wrap(built['front.html'], 'front.html'),
    '/back.html': wrap(built['back.html'], 'back.html'),
  };
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(pages[req.url.split('?')[0]] ?? 'not found');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, close: () => server.close() };
}

export async function startBrowser() {
  return chromium.launch();
}

export function newChecker() {
  let failed = 0;
  return {
    check(name, ok, extra = '') {
      if (!ok) failed++;
      console.log(ok ? 'PASS' : 'FAIL', name, extra);
    },
    finish() {
      console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
      return failed;
    },
  };
}

export async function newDevice(browser, { init } = {}) {
  const context = await browser.newContext({
    viewport: { width: 420, height: 900 },
    hasTouch: true,
  });
  if (init) await context.addInitScript(init);
  return context;
}

/** Draws the letters K, E, Y on the drawing pad, as a finger or pen would. */
export async function drawKey(page, scale = 1.4) {
  const pad = await page.locator('#pad').boundingBox();
  const glyphs = {
    K: [
      [
        [0, 0],
        [0, 45],
      ],
      [
        [25, 0],
        [0, 25],
        [25, 45],
      ],
    ],
    E: [
      [
        [25, 0],
        [0, 0],
        [0, 45],
        [25, 45],
      ],
      [
        [0, 22],
        [18, 22],
      ],
    ],
    Y: [
      [
        [0, 0],
        [13, 22],
        [26, 0],
      ],
      [
        [13, 22],
        [13, 45],
      ],
    ],
  };
  let x = 30;
  for (const letter of ['K', 'E', 'Y']) {
    for (const stroke of glyphs[letter]) {
      const points = stroke.map(([gx, gy]) => [pad.x + x + gx * scale, pad.y + 60 + gy * scale]);
      await page.mouse.move(points[0][0], points[0][1]);
      await page.mouse.down();
      for (const [px, py] of points.slice(1)) await page.mouse.move(px, py, { steps: 3 });
      await page.mouse.up();
    }
    x += 60;
  }
  await page.waitForTimeout(500);
}
