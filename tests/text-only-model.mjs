// A model that cannot read images must never block the card: typed answers still work, and a drawn
// answer gets a plain message instead of a failed request.
import { newChecker, startBrowser, startPages } from './harness.mjs';

const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const pages = await startPages();
const browser = await startBrowser();
const { check, finish } = newChecker();

const device = await browser.newContext({ viewport: { width: 420, height: 900 } });
await device.addInitScript(`
  localStorage.setItem('dr:ai', JSON.stringify({ provider: 'ollama', models: { ollama: 'tiny-text' } }));
  localStorage.setItem('ai:Law::Land', 'on');
  sessionStorage.setItem('write_drawingAi', ${JSON.stringify(pixel)});
  localStorage.setItem('write_drawing', ${JSON.stringify(pixel)});
`);
await device.route('http://localhost:11434/**', async (route) => {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
  if (route.request().url().endsWith('/api/tags')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify({ models: [{ name: 'tiny-text', capabilities: ['completion'] }] }),
    });
  }
  return route.fulfill({ status: 500, body: 'should not be called', headers: cors });
});

const page = await device.newPage();
await page.goto(pages.base + '/front.html');
await page.locator('.ai-status .ai-button', { hasText: 'Settings' }).click();
await page.waitForFunction(
  () => document.querySelectorAll('.ai-select')[1]?.options[0]?.textContent.includes('text only'),
  null,
  { timeout: 8000 },
);
check('the model is labelled "text only"', true);
check(
  'a warning is shown under the model',
  (await page.locator('.ai-note-small').first().innerText()).includes('cannot read images'),
);

await page.goto(pages.base + '/back.html');
await page.locator('.ai-note').first().waitFor();
await page.waitForTimeout(800);
const text = await page.locator('#ai-out').innerText();
check(
  'a drawn answer gets a clear message and no request',
  text.includes('cannot read images') && !text.includes('should not be called'),
);
check('Try again is offered', (await page.locator('#ai-out .ai-button').count()) === 1);

await browser.close();
pages.close();
process.exit(finish() ? 1 : 0);
