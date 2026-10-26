// Needs Ollama running on this computer with a model that can read images (for example gemma4:e4b).
// Not part of "npm test", because it needs a local model.
//
//   OLLAMA_MODEL=gemma4:e4b npm run test:ollama
import { drawKey, newChecker, startBrowser, startPages } from './harness.mjs';

const model = process.env.OLLAMA_MODEL ?? 'gemma4:e4b';
const pages = await startPages();
const browser = await startBrowser();
const { check, finish } = newChecker();

const context = await browser.newContext({ viewport: { width: 420, height: 900 }, hasTouch: true });
await context.addInitScript(`
  localStorage.setItem('dr:ai', JSON.stringify({ provider: 'ollama', models: { ollama: ${JSON.stringify(model)} } }));
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
check('Ollama lists the installed models', models.includes(model), JSON.stringify(models));
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
