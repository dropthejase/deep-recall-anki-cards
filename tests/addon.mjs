// The desktop add-on keeps the card's settings and encrypted keys across restarts. Here a stand-in
// for the add-on's Python (same rules) answers the card's pycmd messages; a fresh browser context
// plays the part of "Anki was restarted". The Python itself is not run by these tests.
import { newChecker, startBrowser, startPages } from './harness.mjs';

const pages = await startPages();
const browser = await startBrowser();
const { check, finish } = newChecker();

const ALLOWED = ['dr:', 'ai:', 'writeMode:', 'puterToken'];
const store = {};
function addon(message) {
  if (!message.startsWith('deeprecall:')) return null;
  const rest = message.slice('deeprecall:'.length);
  const colon = rest.indexOf(':');
  const action = colon < 0 ? rest : rest.slice(0, colon);
  const body = colon < 0 ? '' : rest.slice(colon + 1);
  if (action === 'get') return JSON.stringify(store);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof payload.k !== 'string' || !ALLOWED.some((p) => payload.k.startsWith(p))) return null;
  if (action === 'set' && typeof payload.v === 'string') store[payload.k] = payload.v;
  if (action === 'del') delete store[payload.k];
  return null;
}

async function device({ withAddon, seed }) {
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  if (withAddon) {
    await context.exposeFunction('__bridge', (message) => addon(message));
    await context.addInitScript(() => {
      window.pycmd = (cmd, cb) => window.__bridge(cmd).then((reply) => cb && cb(reply));
    });
  }
  if (seed) {
    await context.addInitScript(`
      if (!localStorage.getItem('seeded')) {
        localStorage.setItem('seeded', '1');
        const seed = ${JSON.stringify(seed)};
        for (const k in seed) localStorage.setItem(k, seed[k]);
      }
    `);
  }
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.slice(0, 200)));
  return { context, page };
}

// 1. First run: choose a provider and Draw, switch AI on.
{
  const { context, page } = await device({ withAddon: true });
  await page.goto(pages.base + '/front.html');
  await page.locator('#ai-on').check();
  await page.locator('.ai-select').first().selectOption('claude');
  await page.locator('#tab-draw').click();
  await page.waitForTimeout(300);
  check(
    'the add-on received the settings',
    store['ai:Law::Land'] === 'on' &&
      store['writeMode:Law::Land'] === 'draw' &&
      JSON.parse(store['dr:ai'] ?? '{}').provider === 'claude',
    JSON.stringify(Object.keys(store)),
  );
  await context.close();
}

// 2. "Anki restarted": empty local storage, the add-on still has everything.
{
  const { context, page } = await device({ withAddon: true });
  await page.goto(pages.base + '/front.html');
  await page.waitForTimeout(600);
  check('the AI switch comes back', await page.locator('#ai-on').isChecked());
  check(
    'the Draw tab comes back',
    (await page.locator('#tab-draw').getAttribute('class')).includes('on'),
  );
  check(
    'the provider comes back',
    (await page.locator('.ai-select').first().inputValue()) === 'claude',
  );
  await context.close();
}

// 3. Settings saved before the add-on existed are handed over, and a key goes in encrypted.
for (const key of Object.keys(store)) delete store[key];
{
  const { context, page } = await device({
    withAddon: true,
    seed: { puterToken: 'old-plain-token', 'ai:Law::Land': 'on' },
  });
  await page.goto(pages.base + '/front.html');
  await page.waitForTimeout(600);
  check('earlier local settings are handed to the add-on', store.puterToken === 'old-plain-token');
  await page.locator('.ai-status .ai-button', { hasText: 'Settings' }).click();
  await page.locator('input[placeholder="Choose a passphrase"]').fill('pw');
  await page.locator('input[placeholder="Repeat the passphrase"]').fill('pw');
  await page.locator('.ai-key .ai-button', { hasText: 'Protect' }).click();
  await page.waitForFunction(() => localStorage.getItem('dr:key:puter') !== null, null, {
    timeout: 10000,
  });
  await page.waitForTimeout(300);
  check(
    'the encrypted key is stored and the plain one removed',
    typeof store['dr:key:puter'] === 'string' &&
      store['dr:key:puter'].includes('ciphertext') &&
      !('puterToken' in store),
  );
  await context.close();
}
{
  const { context, page } = await device({ withAddon: true });
  await page.goto(pages.base + '/front.html');
  await page.waitForTimeout(600);
  await page.locator('.ai-select').first().selectOption('puter');
  check(
    'after a restart the key is there but locked',
    (await page.locator('.ai-key', { hasText: 'is locked' }).count()) === 1,
  );
  await context.close();
}

// 4. Keys outside the allowed list are refused.
{
  const before = Object.keys(store).length;
  addon('deeprecall:set:' + JSON.stringify({ k: 'something-else', v: 'x' }));
  check('an unknown key is refused', Object.keys(store).length === before);
}

// 5. No add-on installed: pycmd exists, but nothing answers.
{
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await context.addInitScript(() => {
    window.pycmd = (cmd, cb) => cb && cb(null);
  });
  const page = await context.newPage();
  const start = Date.now();
  await page.goto(pages.base + '/front.html');
  await page.locator('#ai-on').check();
  check(
    'without the add-on the card works as before',
    (await page.locator('.ai-panel').count()) === 1 && Date.now() - start < 1500,
  );
  await context.close();
}

// 6. pycmd exists and never answers: the card gives up after about two seconds.
{
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await context.addInitScript(() => {
    window.pycmd = () => {};
  });
  const page = await context.newPage();
  await page.goto(pages.base + '/front.html');
  await page.waitForTimeout(2600);
  await page.locator('#ai-on').check();
  check('a silent bridge does not stop the card', (await page.locator('.ai-panel').count()) === 1);
  await context.close();
}

await browser.close();
pages.close();
process.exit(finish() ? 1 : 0);
