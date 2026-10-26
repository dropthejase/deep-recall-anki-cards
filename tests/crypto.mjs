// The key store itself: what is written to storage, and what happens when it is changed or guessed at.
import { newChecker, startBrowser, startPages } from './harness.mjs';

const pages = await startPages();
const browser = await startBrowser();
const { check, finish } = newChecker();

const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.slice(0, 200)));
await page.goto(pages.base + '/front.html');

const SECRET = 'sk-test-secret-value-1234567890';

const result = await page.evaluate(async (secret) => {
  const AI = window.DRAI;
  const read = () => JSON.parse(localStorage.getItem('dr:key:claude'));
  const out = {};

  await AI.saveKey('claude', secret, 'correct horse battery staple');
  const first = read();
  out.raw = localStorage.getItem('dr:key:claude');
  out.state = AI.keyState('claude');

  AI.removeKey('claude');
  await AI.saveKey('claude', secret, 'correct horse battery staple');
  const second = read();
  out.record = first;
  out.sameSalt = first.salt === second.salt;
  out.sameIv = first.iv === second.iv;
  out.sameCiphertext = first.ciphertext === second.ciphertext;

  // A new session: nothing unlocked.
  sessionStorage.clear();
  out.lockedAfterSessionEnds = AI.keyState('claude');

  // A wrong passphrase.
  try {
    await AI.unlock('claude', 'wrong');
    out.wrong = 'unlocked';
  } catch (e) {
    out.wrong = e.kind;
  }

  // A changed record: flip one character of the ciphertext.
  const tampered = read();
  const bytes = atob(tampered.ciphertext);
  tampered.ciphertext = btoa(String.fromCharCode(bytes.charCodeAt(0) ^ 1) + bytes.slice(1));
  localStorage.setItem('dr:key:claude', JSON.stringify(tampered));
  try {
    await AI.unlock('claude', 'correct horse battery staple');
    out.tampered = 'unlocked';
  } catch (e) {
    out.tampered = e.kind;
  }

  // A record with an iteration count that is far too low, or absurdly high.
  const weak = read();
  weak.iterations = 1000;
  localStorage.setItem('dr:key:claude', JSON.stringify(weak));
  try {
    await AI.unlock('claude', 'correct horse battery staple');
    out.weak = 'unlocked';
  } catch (e) {
    out.weak = e.kind;
  }
  const huge = read();
  huge.iterations = 900000000;
  localStorage.setItem('dr:key:claude', JSON.stringify(huge));
  try {
    await AI.unlock('claude', 'correct horse battery staple');
    out.huge = 'unlocked';
  } catch (e) {
    out.huge = e.kind;
  }

  // The untouched record still opens with the right passphrase.
  localStorage.setItem('dr:key:claude', JSON.stringify(second));
  await AI.unlock('claude', 'correct horse battery staple');
  out.opened = AI.getKey('claude');
  return out;
}, SECRET);

check('the stored value does not contain the key', !result.raw.includes(SECRET));
check(
  'it records the format, 600,000 rounds, a salt, an IV and the ciphertext',
  result.record.v === 1 &&
    result.record.iterations === 600000 &&
    Boolean(result.record.salt) &&
    Boolean(result.record.iv) &&
    Boolean(result.record.ciphertext),
);
check(
  'saving the same key twice gives a different salt, IV and ciphertext',
  !result.sameSalt && !result.sameIv && !result.sameCiphertext,
);
check('a saved key is ready right after saving', result.state === 'ready');
check('the key is locked when the session ends', result.lockedAfterSessionEnds === 'locked');
check('a wrong passphrase is refused', result.wrong === 'passphrase');
check(
  'a changed record is refused',
  result.tampered === 'passphrase' || result.tampered === 'keydamaged',
  result.tampered,
);
check('a record with too few rounds is refused', result.weak === 'keydamaged', result.weak);
check(
  'a record with an absurd number of rounds is refused',
  result.huge === 'keydamaged',
  result.huge,
);
check('the right passphrase gets the key back', result.opened === SECRET);

await browser.close();
pages.close();
process.exit(finish() ? 1 : 0);
