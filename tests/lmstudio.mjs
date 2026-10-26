// Needs LM Studio running on this computer with Local API server and CORS turned on, and a model that
// can read images. Not part of "npm test", because it needs a local model.
//
//   LMSTUDIO_URL=http://localhost:1234 LMSTUDIO_MODEL=qwen/qwen3.5-9b npm run test:lmstudio
import { drawKey, newChecker, startBrowser, startPages } from './harness.mjs';

const model = process.env.LMSTUDIO_MODEL ?? 'qwen/qwen3.5-9b';
const address = process.env.LMSTUDIO_URL ?? 'http://localhost:1234';
const pages = await startPages();
const browser = await startBrowser();
const { check, finish } = newChecker();

const context = await browser.newContext({ viewport: { width: 420, height: 900 }, hasTouch: true });
await context.addInitScript(`
  localStorage.setItem('dr:ai', JSON.stringify({ provider: 'lmstudio', lmstudioUrl: ${JSON.stringify(address)}, models: { lmstudio: ${JSON.stringify(model)} } }));
  localStorage.setItem('ai:Law::Land', 'on');
`);
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.slice(0, 200)));

await page.goto(pages.base + '/front.html');
await page.locator('.ai-status .ai-button', { hasText: 'Settings' }).click();
await page.waitForFunction(
  () => document.querySelectorAll('.ai-select')[1]?.options.length > 1,
  null,
  { timeout: 8000 },
);
const models = await page
  .locator('.ai-select')
  .nth(1)
  .evaluate((s) => [...s.options].map((o) => o.value));
check(
  'LM Studio lists its models, without the embedding model',
  models.includes(model) && !models.some((m) => /embed/i.test(m)),
  JSON.stringify(models),
);
await page.locator('.ai-panel .ai-button', { hasText: 'Done' }).click();

await page
  .locator('#typed')
  .fill('Something of value that each side gives for the other side promise.');
await page.goto(pages.base + '/back.html');
await page
  .locator('.ai-box')
  .waitFor({ timeout: 120000 })
  .catch(() => {});
const typed = await page.locator('#ai-out').innerText();
console.log('typed answer ->', JSON.stringify(typed.slice(0, 300)));
check('a typed answer is graded', /Completeness: \d of 5/.test(typed));

await page.goto(pages.base + '/front.html');
await page.click('#tab-draw');
await drawKey(page);
await page.goto(pages.base + '/back.html');
await page
  .locator('.ai-box')
  .waitFor({ timeout: 120000 })
  .catch(() => {});
const drawn = await page.locator('#ai-out').innerText();
console.log('drawn answer ->', JSON.stringify(drawn.slice(0, 300)));
check('a drawn answer is read and graded', /Completeness: \d of 5/.test(drawn));

await browser.close();
pages.close();
process.exit(finish() ? 1 : 0);
