// The deck name above the question: the last three levels, or all of them when there are fewer, exactly
// as Anki spells them. The saved settings still use the full deck name.
import { newChecker, startBrowser, startPages } from './harness.mjs';

const browser = await startBrowser();
const { check, finish } = newChecker();

async function crumbs(deck, side) {
  const pages = await startPages({ deck });
  const page = await browser.newPage();
  await page.goto(pages.base + '/' + side);
  await page.locator('.crumb').first().waitFor();
  const shown = await page.locator('.crumb').allTextContents();
  pages.close();
  await page.close();
  return shown;
}

for (const side of ['front.html', 'back.html']) {
  const deep = await crumbs('My-Flashcards::FLK1::Session2::Contract-Law::Terms', side);
  check(
    `${side}: a deep deck shows its last three levels, spelled as named`,
    deep.join('|') === 'Session2|Contract-Law|Terms',
    JSON.stringify(deep),
  );
  const short = await crumbs('Law::Land', side);
  check(`${side}: fewer levels than the limit shows them all`, short.join('|') === 'Law|Land');
  const single = await crumbs('Law', side);
  check(`${side}: a top-level deck shows itself`, single.join('|') === 'Law');
}

await browser.close();
process.exit(finish() ? 1 : 0);
