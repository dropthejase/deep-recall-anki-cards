// "Ignore finger": with it on, a touch must not draw (so a resting palm leaves no marks), while a
// mouse or pen still does. The setting is remembered.
import { drawKey, newChecker, startBrowser, startPages } from './harness.mjs';

const pages = await startPages();
const browser = await startBrowser();
const { check, finish } = newChecker();

const context = await browser.newContext({ viewport: { width: 420, height: 900 }, hasTouch: true });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.slice(0, 200)));
await page.goto(pages.base + '/front.html');
await page.click('#tab-draw');

const drawn = () => page.evaluate(() => window.__drawing || '');
async function tapPad() {
  const pad = await page.locator('#pad').boundingBox();
  await page.touchscreen.tap(pad.x + pad.width / 2, pad.y + pad.height / 2);
  await page.waitForTimeout(600);
}

check(
  'the Ignore finger box is shown on a touch screen',
  await page.locator('#ignore-finger').isVisible(),
);

await tapPad();
check('a finger draws by default', (await drawn()) !== '');
await page.click('#clear');
await page.waitForTimeout(600);
check('Clear removes it', (await drawn()) === '');

await page.locator('#ignore-finger').check();
await tapPad();
check('with Ignore finger on, a finger does not draw', (await drawn()) === '');

await drawKey(page);
check('a mouse or pen still draws', (await drawn()) !== '');

await page.reload();
await page.click('#tab-draw');
check('the setting is remembered', await page.locator('#ignore-finger').isChecked());

await browser.close();
pages.close();
process.exit(finish() ? 1 : 0);
