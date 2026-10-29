// The Cloze note type: the question hides the words, and the answer side shows them as the answer,
// with the Back Extra field under it. The model is asked with the blanks put back.
import { newChecker, startBrowser, startPages } from './harness.mjs';

const browser = await startBrowser();
const { check, finish } = newChecker();

async function open(side, options) {
  const pages = await startPages({ variant: 'cloze', ...options });
  const page = await browser.newPage();
  await page.goto(pages.base + '/' + side);
  return {
    page,
    close: async () => {
      pages.close();
      await page.close();
    },
  };
}

{
  const { page, close } = await open('front.html', { cloze: ['consideration'] });
  const text = await page.locator('.question').innerText();
  check(
    'front: the question shows a blank, not the word',
    text.includes('[...]') && !text.includes('consideration'),
  );
  check('front: there is still a place to type', (await page.locator('#typed').count()) === 1);
  await close();
}
{
  const { page, close } = await open('back.html', {
    cloze: ['consideration'],
    extra: 'See Currie v Misa.',
  });
  check(
    'back: one blank gives the word as the answer',
    (await page.locator('.answer').first().innerText()) === 'consideration',
  );
  check(
    'back: the Back Extra field is shown under it',
    (await page.locator('.answer-extra').innerText()).includes('Currie v Misa'),
  );
  await close();
}
{
  const { page, close } = await open('back.html', { cloze: ['offer', 'acceptance'] });
  const items = await page.locator('.answer').first().locator('li').allInnerTexts();
  check(
    'back: two blanks give a list of both words',
    items.join('|') === 'offer|acceptance',
    JSON.stringify(items),
  );
  check(
    'back: an empty Back Extra takes no space',
    !(await page.locator('.answer-extra').isVisible()),
  );
  await close();
}
{
  // A normal card is untouched by the cloze code.
  const pages = await startPages();
  const page = await browser.newPage();
  await page.goto(pages.base + '/back.html');
  check(
    'basic: the answer is the Back field',
    (await page.locator('.answer').first().innerText()).includes('Something of value'),
  );
  check('basic: there is no extra block', (await page.locator('.answer-extra').count()) === 0);
  pages.close();
  await page.close();
}
{
  // The request to the model holds the question with a blank and the hidden word as the reference.
  const pages = await startPages({ variant: 'cloze', cloze: ['consideration'] });
  const device = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await device.addInitScript(`
    localStorage.setItem('dr:ai', JSON.stringify({ provider: 'ollama', models: { ollama: 'tiny' } }));
    localStorage.setItem('ai:Law::Land', 'on');
    localStorage.setItem('write_typed', 'something of value');
  `);
  let sent = '';
  await device.route('http://localhost:11434/**', async (route) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (route.request().url().endsWith('/api/tags'))
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: cors,
        body: JSON.stringify({
          models: [{ name: 'tiny', capabilities: ['completion', 'vision'] }],
        }),
      });
    if (route.request().method() === 'POST') sent = route.request().postData() ?? '';
    return route.fulfill({ status: 500, body: 'no', headers: cors });
  });
  const page = await device.newPage();
  await page.goto(pages.base + '/back.html');
  await page.waitForTimeout(1500);
  const user = JSON.stringify(JSON.parse(sent || '{}'));
  const question = user.split('<question>')[1]?.split('</question>')[0] ?? '';
  const reference = user.split('<reference_answer>')[1]?.split('</reference_answer>')[0] ?? '';
  check(
    'AI: the question sent has a blank, not the answer',
    question.includes('[...]') && !question.includes('consideration'),
    question.slice(0, 120),
  );
  check('AI: the reference answer is the hidden word', reference.includes('consideration'));
  pages.close();
}

await browser.close();
process.exit(finish() ? 1 : 0);
