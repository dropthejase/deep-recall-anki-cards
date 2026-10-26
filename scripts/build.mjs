// Builds the files you paste into Anki. The shared AI code (card/_deeprecall-ai.js) is written into
// both templates, so each template is one self-contained file and nothing has to sync as media.
//
//   node scripts/build.mjs        writes dist/front.html, dist/back.html and dist/style.css
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SHARED_TAG = '<script src="_deeprecall-ai.js"></script>';

export function buildCard() {
  const read = (file) => readFileSync(root + file, 'utf8');
  const shared = read('card/_deeprecall-ai.js');
  const inline = (html) => {
    if (!html.includes(SHARED_TAG))
      throw new Error('A template is missing the shared-code script tag.');
    return html.replace(SHARED_TAG, () => `<script>\n${shared}</script>`);
  };
  return {
    'front.html': inline(read('card/front.html')),
    'back.html': inline(read('card/back.html')),
    'style.css': read('card/style.css'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(root + 'dist', { recursive: true });
  for (const [name, text] of Object.entries(buildCard()))
    writeFileSync(root + 'dist/' + name, text);
  console.log('built dist/front.html, dist/back.html, dist/style.css');
}
