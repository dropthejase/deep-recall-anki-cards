// Adds a "DeepRecall" note type to Anki through the AnkiConnect add-on, using the templates built
// from card/. If the note type exists it is updated instead. Three sample notes go in a deck called
// "Deep Recall Sample" the first time. It never touches your other note types or decks.
//
//   node scripts/install.mjs
import { buildCard } from './build.mjs';

const ENDPOINT = 'http://127.0.0.1:8765/api/v1';
const NAME = 'DeepRecall';
const DECK = 'Deep Recall Sample';

// Three short cards to try the card with: criminal law, business law and land law.
const SAMPLES = [
  [
    'What is the standard of proof the prosecution must meet to secure a conviction?',
    'Beyond reasonable doubt.',
  ],
  [
    'What majority is needed to pass an ordinary resolution versus a special resolution?',
    '<ul><li><b>Ordinary resolution:</b> more than 50% of those voting</li><li><b>Special resolution:</b> at least 75% of those voting</li></ul>',
  ],
  [
    'What two-part test determines whether an item is a fixture or a chattel?',
    '<ul><li>Degree of annexation</li><li>Purpose of annexation</li></ul>',
  ],
];

async function call(method, params) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = await response.json();
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result;
}

const card = buildCard();
const exists = JSON.stringify(await call('noteTypes.list', {})).includes(`"${NAME}"`);

if (exists) {
  await call('noteTypes.editStructure', {
    noteType: { name: NAME },
    edits: [
      {
        op: 'updateTemplate',
        name: 'Write',
        patch: { questionHtml: card['front.html'], answerHtml: card['back.html'] },
      },
    ],
  });
  await call('noteTypes.update', { noteType: { name: NAME }, patch: { css: card['style.css'] } });
  console.log('Updated the', NAME, 'note type.');
} else {
  await call('noteTypes.create', {
    name: NAME,
    fields: [{ name: 'Front' }, { name: 'Back' }],
    templates: [{ name: 'Write', questionHtml: card['front.html'], answerHtml: card['back.html'] }],
    css: card['style.css'],
  });
  await call('decks.create', { name: DECK });
  for (const [Front, Back] of SAMPLES) {
    await call('notes.create', {
      noteType: { name: NAME },
      deck: { name: DECK },
      fields: { Front, Back },
      tags: ['deeprecall-sample'],
    });
  }
  console.log('Added the', NAME, 'note type and a', DECK, 'deck with', SAMPLES.length, 'cards.');
}
