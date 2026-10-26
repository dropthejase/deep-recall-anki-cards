// Claude and OpenAI keys: encrypted storage, locking, forgotten passphrases, and the shape of the
// requests the card sends. The two provider servers are made up here (Playwright answers for them),
// so this checks the card's side only, not the real services.
import { DECK, newChecker, newDevice, startBrowser, startPages } from './harness.mjs';

const pages = await startPages();
const browser = await startBrowser();
const { check, finish } = newChecker();

const context = await newDevice(browser, {
  init: () => localStorage.setItem('ai:Law::Land', 'on'),
});
const seen = {};
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
};

await context.route('https://api.anthropic.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (req.method() === 'GET') {
    seen.claudeUrl = req.url();
    seen.claudeKey = req.headers()['x-api-key'];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"data":[]}',
      headers: cors,
    });
  }
  seen.claudeKey = req.headers()['x-api-key'];
  seen.claudeBrowser = req.headers()['anthropic-dangerous-direct-browser-access'];
  seen.claudeBody = JSON.parse(req.postData());
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: cors,
    body: JSON.stringify({
      content: [
        {
          type: 'tool_use',
          name: 'submit_grade',
          input: {
            strengths: 'Good.',
            improvements: ['Mention bargain.'],
            rating: 4,
            confidence: 80,
          },
        },
      ],
      usage: {},
    }),
  });
});
await context.route('https://api.openai.com/**', async (route) => {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (req.method() === 'GET') {
    // A key limited to the chat permission cannot list models.
    return route.fulfill({
      status: 403,
      contentType: 'application/json',
      headers: cors,
      body: '{"error":{"message":"Missing scopes: api.model.read"}}',
    });
  }
  seen.openaiBody = JSON.parse(req.postData());
  seen.openaiAuth = req.headers().authorization;
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: cors,
    body: JSON.stringify({
      choices: [
        {
          message: {
            content:
              '```json\n{"strengths":"Fine.","improvements":[],"rating":5,"confidence":90}\n```',
          },
        },
      ],
    }),
  });
});

const page = await context.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.slice(0, 200)));
await page.goto(pages.base + '/front.html');

check(
  'settings open by themselves when nothing is set up',
  (await page.locator('.ai-panel').count()) === 1,
);
await page.locator('.ai-select').first().selectOption('claude');
check(
  'Claude asks for a passphrase',
  (await page.locator('input[placeholder="Choose a passphrase"]').count()) === 1,
);
await page.locator('input[placeholder="Anthropic API key"]').fill('sk-ant-test-123');
await page.locator('input[placeholder="Choose a passphrase"]').fill('pass one');
await page.locator('input[placeholder="Repeat the passphrase"]').fill('pass two');
await page.locator('.ai-key .ai-button', { hasText: 'Save' }).click();
check(
  'mismatched passphrases are refused',
  (await page.locator('.ai-msg').innerText()).includes('not the same'),
);
await page.locator('input[placeholder="Repeat the passphrase"]').fill('pass one');
await page.locator('.ai-key .ai-button', { hasText: 'Save' }).click();
await page.locator('.ai-key', { hasText: 'saved.' }).waitFor();
check(
  'the key is checked against the free models list',
  seen.claudeUrl?.endsWith('/v1/models') && seen.claudeKey === 'sk-ant-test-123',
);
const stored = await page.evaluate(() => localStorage.getItem('dr:key:claude'));
check(
  'the key is stored encrypted',
  Boolean(stored) && !stored.includes('sk-ant-test-123') && stored.includes('ciphertext'),
);

// A new tab is a new session, so the key is locked again.
const page2 = await context.newPage();
await page2.goto(pages.base + '/front.html');
check(
  'the key is locked in a new session',
  (await page2.locator('.ai-key', { hasText: 'is locked' }).count()) === 1,
);
await page2.locator('input[placeholder="Passphrase"]').fill('nope');
await page2.locator('.ai-key .ai-button', { hasText: 'Unlock' }).click();
await page2.locator('.ai-msg', { hasText: 'Wrong passphrase' }).waitFor();
check('a wrong passphrase is refused', true);
check(
  'removing a key without the passphrase is offered',
  (await page2.locator('.ai-key .ai-button', { hasText: 'Forgot passphrase' }).count()) === 1,
);

await page2.locator('#typed').fill('Something of value given for a promise.');
await page2.goto(pages.base + '/back.html');
await page2.locator('.ai-note').first().waitFor();
check(
  'the answer side says the key is locked',
  (await page2.locator('#ai-out').innerText()).includes('locked'),
);

await page2.goto(pages.base + '/front.html');
await page2.locator('input[placeholder="Passphrase"]').fill('pass one');
await page2.locator('.ai-key .ai-button', { hasText: 'Unlock' }).click();
await page2.locator('.ai-key', { hasText: 'saved.' }).waitFor();
await page2.locator('#typed').fill('Something of value given for a promise.');
await page2.goto(pages.base + '/back.html');
await page2.locator('.ai-box').waitFor({ timeout: 10000 });
const claudeOut = await page2.locator('#ai-out').innerText();
check(
  'Claude feedback is shown',
  /Completeness: 4 of 5/.test(claudeOut) && claudeOut.includes('Mention bargain'),
);
check(
  'the Claude request has the right shape',
  seen.claudeKey === 'sk-ant-test-123' &&
    seen.claudeBrowser === 'true' &&
    seen.claudeBody?.model === 'claude-haiku-5-5' &&
    seen.claudeBody?.tool_choice?.name === 'submit_grade',
);
check(
  'a typed answer is sent as text',
  JSON.stringify(seen.claudeBody.messages).includes('student_answer'),
);

// Forgot the passphrase: remove, then add the key again.
await page2.goto(pages.base + '/front.html');
await page2.locator('.ai-status .ai-button', { hasText: 'Settings' }).click();
await page2.locator('.ai-key .ai-button', { hasText: 'Remove key' }).click();
check(
  'the key is removed',
  (await page2.evaluate(() => localStorage.getItem('dr:key:claude'))) === null,
);
check(
  'the paste box comes back',
  (await page2.locator('input[placeholder="Anthropic API key"]').count()) === 1,
);

// Other… lets you type any model name, and the name is saved.
await page2.locator('.ai-select').nth(1).selectOption('__other');
const nameBox = page2.locator('input[placeholder="for example claude-haiku-5-5"]');
check('Other… shows a box for the model name', (await nameBox.count()) === 1);
await nameBox.fill('claude-sonnet-4-6');
await nameBox.press('Tab');
check(
  'the typed model name is saved',
  JSON.parse(await page2.evaluate(() => localStorage.getItem('dr:ai'))).models.claude ===
    'claude-sonnet-4-6',
);

// OpenAI, with a key that cannot list models.
await page2.locator('.ai-select').first().selectOption('openai');
await page2.locator('input[placeholder="OpenAI API key"]').fill('sk-openai-test');
await page2.locator('input[placeholder="Choose a passphrase"]').fill('abc');
await page2.locator('input[placeholder="Repeat the passphrase"]').fill('abc');
await page2.locator('.ai-key .ai-button', { hasText: 'Save' }).click();
await page2.locator('.ai-key', { hasText: 'saved.' }).waitFor();
check('a key that cannot list models is still accepted', true);
await page2.locator('#typed').fill('A bargained-for exchange.');
await page2.goto(pages.base + '/back.html');
await page2.locator('.ai-box').waitFor({ timeout: 10000 });
check(
  'OpenAI feedback is shown (reply wrapped in a code fence)',
  /Completeness: 5 of 5/.test(await page2.locator('#ai-out').innerText()),
);
check(
  'the OpenAI request has the right shape',
  seen.openaiAuth === 'Bearer sk-openai-test' &&
    seen.openaiBody?.model === 'gpt-6-luna' &&
    seen.openaiBody?.max_completion_tokens === 900 &&
    !('reasoning_effort' in seen.openaiBody),
);

// Each provider keeps its own key.
await page2.goto(pages.base + '/front.html');
await page2.locator('.ai-status .ai-button', { hasText: 'Settings' }).click();
await page2.locator('.ai-select').first().selectOption('puter');
await page2.locator('.ai-select').first().selectOption('openai');
check(
  'switching provider keeps the other keys',
  (await page2.locator('.ai-key', { hasText: 'saved.' }).count()) === 1,
);

await browser.close();
pages.close();
void DECK;
process.exit(finish() ? 1 : 0);
