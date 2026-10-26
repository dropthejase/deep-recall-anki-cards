// Settings can be rewritten by any card in the same Anki, so the Ollama address must never point
// anywhere but this computer, and nothing may be sent to a rewritten address.
import { newChecker, startBrowser, startPages } from './harness.mjs';

const pages = await startPages();
const browser = await startBrowser();
const { check, finish } = newChecker();

const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
let reachedElsewhere = false;
await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => {
  reachedElsewhere = true;
  route.abort();
});
const page = await context.newPage();
await page.goto(pages.base + '/front.html');

const outcome = await page.evaluate(async () => {
  const AI = window.DRAI;
  const out = {};
  const addresses = [
    'https://evil.example.com',
    'http://evil.example.com:11434',
    'http://192.168.1.20:11434',
    'https://localhost.evil.example.com',
    'http://localhost.evil.example.com',
    'ftp://localhost',
    'not a url',
  ];
  for (const address of addresses) {
    try {
      await AI.listOllama(address);
      out[address] = 'accepted';
    } catch (e) {
      out[address] = e.kind;
    }
  }
  // The address a card could have written into the saved settings.
  AI.setConfig({
    provider: 'ollama',
    ollamaUrl: 'https://evil.example.com',
    models: { ollama: 'gemma4:e4b' },
  });
  try {
    await AI.grade({ system: 's', user: 'u', schema: { type: 'object' }, image: '' });
    out.grade = 'sent';
  } catch (e) {
    out.grade = e.kind;
  }
  return out;
});

for (const [address, result] of Object.entries(outcome)) {
  if (address === 'grade') continue;
  check(`${address} is refused`, result === 'nomodel', result);
}
check('a request with a rewritten address is refused', outcome.grade === 'nomodel', outcome.grade);
check('nothing was sent to another host', !reachedElsewhere);

await browser.close();
pages.close();
process.exit(finish() ? 1 : 0);
