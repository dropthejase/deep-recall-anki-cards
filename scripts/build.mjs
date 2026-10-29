// Builds the files you paste into Anki. The shared AI code (card/_deeprecall-ai.js) is written into
// both templates, so each template is one self-contained file and nothing has to sync as media.
//
//   node scripts/build.mjs        writes dist/ (Basic) and dist/cloze/ (Cloze)
//
// One source in card/ makes every note type. A variant lists the lines of the Basic templates that
// change for it; the build fails if one of those lines is no longer in the source.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SHARED_TAG = '<script src="_deeprecall-ai.js"></script>';

export const VARIANTS = {
  basic: {
    noteType: 'DeepRecall-Basic',
    fields: ['Front', 'Back'],
    dir: 'dist/',
    swaps: {},
  },
  cloze: {
    noteType: 'DeepRecall-Cloze',
    fields: ['Text', 'Back Extra'],
    dir: 'dist/cloze/',
    swaps: {
      'front.html': [
        ['<div class="question">{{Front}}</div>', '<div class="question">{{cloze:Text}}</div>'],
      ],
      'back.html': [
        ['<div class="question">{{Front}}</div>', '<div class="question">{{cloze:Text}}</div>'],
        [
          '<div class="answer">{{Back}}</div>',
          '<div class="answer" data-cloze-answer></div>\n      <div class="answer answer-extra">{{Back Extra}}</div>',
        ],
      ],
    },
  },
};

export function buildCard(variant = 'basic') {
  const read = (file) => readFileSync(root + file, 'utf8');
  const shared = read('card/_deeprecall-ai.js');
  const swaps = VARIANTS[variant].swaps;
  const make = (name) => {
    let html = read('card/' + name);
    // A checked-out file may have CRLF line endings; the lines to swap are written with LF.
    const crlf = html.includes('\r\n');
    if (crlf) html = html.replace(/\r\n/g, '\n');
    for (const [from, to] of swaps[name] ?? []) {
      if (!html.includes(from))
        throw new Error(`${name}: the line to change for ${variant} is missing: ${from}`);
      html = html.replace(from, () => to);
    }
    if (!html.includes(SHARED_TAG))
      throw new Error('A template is missing the shared-code script tag.');
    html = html.replace(SHARED_TAG, () => `<script>\n${shared}</script>`);
    return crlf ? html.replace(/\n/g, '\r\n') : html;
  };
  return {
    'front.html': make('front.html'),
    'back.html': make('back.html'),
    'style.css': read('card/style.css'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [variant, { dir }] of Object.entries(VARIANTS)) {
    mkdirSync(root + dir, { recursive: true });
    for (const [name, text] of Object.entries(buildCard(variant)))
      writeFileSync(root + dir + name, text);
    console.log(`built ${dir}front.html, ${dir}back.html, ${dir}style.css`);
  }
}
