// LM Studio against a pretend server: embedding models are hidden, a text-only model is labelled and
// blocks a drawn answer, the standard model list is the fallback, and a rewritten address is refused.
import { newChecker, startBrowser, startPages } from './harness.mjs';

const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

const pages = await startPages();
const browser = await startBrowser();
const { check, finish } = newChecker();

async function openSettings(context, models) {
  await context.route('http://localhost:1234/**', (route) => {
    const url = route.request().url();
    if (url.endsWith('/api/v0/models') && models.v0) {
      return route.fulfill({
        status: 200,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify({ data: models.v0 }),
      });
    }
    if (url.endsWith('/v1/models')) {
      return route.fulfill({
        status: 200,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify({ data: models.v1 }),
      });
    }
    return route.fulfill({ status: 404, headers: cors, body: 'not found' });
  });
  const page = await context.newPage();
  await page.goto(pages.base + '/front.html');
  await page.locator('.ai-status .ai-button', { hasText: 'Settings' }).click();
  await page.waitForFunction(
    () => document.querySelectorAll('.ai-select')[1]?.options.length > 1,
    null,
    { timeout: 8000 },
  );
  return page;
}
const optionsOf = (page) =>
  page
    .locator('.ai-select')
    .nth(1)
    .evaluate((s) => [...s.options].map((o) => o.textContent));

// 1. LM Studio's own list: a vision model, a text-only model and an embedding model.
const first = await browser.newContext({ viewport: { width: 420, height: 900 } });
await first.addInitScript(`
  localStorage.setItem('dr:ai', JSON.stringify({ provider: 'lmstudio', models: { lmstudio: 'plain-llm' } }));
  localStorage.setItem('ai:Law::Land', 'on');
  sessionStorage.setItem('write_drawingAi', ${JSON.stringify(pixel)});
  localStorage.setItem('write_drawing', ${JSON.stringify(pixel)});
`);
const page = await openSettings(first, {
  v0: [
    { id: 'seer', type: 'vlm' },
    { id: 'plain-llm', type: 'llm' },
    { id: 'embed-it', type: 'embeddings' },
  ],
});
const options = await optionsOf(page);
check('a vision model is listed', options.includes('seer'), JSON.stringify(options));
check('a text-only model is labelled', options.includes('plain-llm (text only)'));
check('the embedding model is hidden', !options.some((o) => o.includes('embed-it')));
check(
  'the settings show the LM Studio address',
  (await page.locator('.ai-token').first().inputValue()) === 'http://localhost:1234',
);

// The Base URL copied from LM Studio ends in /v1, and that is accepted.
const copied = await page.evaluate(() =>
  window.DRAI.listLocal('lmstudio', 'http://localhost:1234/v1').then((m) => m.length),
);
check('the Base URL with /v1 on the end works', copied === 2, String(copied));

// A drawn answer on a text-only model gets a message and no chat request.
let chatCalls = 0;
await first.route('http://localhost:1234/v1/chat/completions', (route) => {
  chatCalls++;
  route.fulfill({ status: 500, headers: cors, body: 'should not be called' });
});
await page.goto(pages.base + '/back.html');
await page.locator('.ai-note').first().waitFor();
await page.waitForTimeout(800);
check(
  'a drawn answer on a text-only model is explained',
  (await page.locator('#ai-out').innerText()).includes('cannot read images'),
);
check('and nothing is sent to the model', chatCalls === 0);

// 2. Without the detailed list, the standard one is used and image support is unknown.
const second = await browser.newContext({ viewport: { width: 420, height: 900 } });
await second.addInitScript(`
  localStorage.setItem('dr:ai', JSON.stringify({ provider: 'lmstudio', models: { lmstudio: 'a-model' } }));
  localStorage.setItem('ai:Law::Land', 'on');
`);
const fallback = await openSettings(second, {
  v0: null,
  v1: [{ id: 'a-model' }, { id: 'text-embedding-nomic' }],
});
const fallbackOptions = await optionsOf(fallback);
check(
  'the standard list is the fallback',
  fallbackOptions.includes('a-model'),
  JSON.stringify(fallbackOptions),
);
check('image support is not guessed', !fallbackOptions.includes('a-model (text only)'));
check('embedding models are still hidden', !fallbackOptions.some((o) => o.includes('embed')));

// 3. A rewritten address is refused and nothing leaves this computer.
const third = await browser.newContext({ viewport: { width: 420, height: 900 } });
let reachedElsewhere = false;
await third.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => {
  reachedElsewhere = true;
  route.abort();
});
const probe = await third.newPage();
await probe.goto(pages.base + '/front.html');
const outcome = await probe.evaluate(async () => {
  const AI = window.DRAI;
  const out = {};
  try {
    await AI.listLocal('lmstudio', 'http://192.168.1.20:1234');
    out.list = 'accepted';
  } catch (e) {
    out.list = e.kind;
  }
  AI.setConfig({
    provider: 'lmstudio',
    lmstudioUrl: 'https://evil.example.com',
    models: { lmstudio: 'm' },
  });
  try {
    await AI.grade({ system: 's', user: 'u', schema: { type: 'object' }, image: '' });
    out.grade = 'sent';
  } catch (e) {
    out.grade = e.kind;
  }
  return out;
});
check('an address that is not this computer is refused', outcome.list === 'nomodel', outcome.list);
check(
  'a rewritten LM Studio address is refused when grading',
  outcome.grade === 'nomodel',
  outcome.grade,
);
check('nothing was sent to another host', !reachedElsewhere);

await browser.close();
pages.close();
process.exit(finish() ? 1 : 0);
