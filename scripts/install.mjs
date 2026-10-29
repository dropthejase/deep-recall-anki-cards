// Adds the "DeepRecall-Basic" and "DeepRecall-Cloze" note types to Anki through the AnkiConnect
// add-on, using the templates built from card/. A note type that exists is updated instead (a Basic
// one still named "DeepRecall" from version 0.1 is updated too). Sample notes go in a deck called
// "Deep Recall Sample" the first time. It never touches your other note types or decks.
//
//   node scripts/install.mjs
import { buildCard } from './build.mjs';

const ENDPOINT = 'http://127.0.0.1:8765/api/v1';
const DECK = 'Deep Recall Sample';
const OLD_BASIC_NAME = 'DeepRecall';

// Short cards to try the card with: criminal law, business law and land law.
const BASIC_SAMPLES = [
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
const CLOZE_SAMPLES = [
  'The standard of proof in a criminal trial is {{c1::beyond reasonable doubt}}.',
  'An ordinary resolution needs {{c1::more than 50%}} of the votes cast, and a special resolution needs {{c2::at least 75%}}.',
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

const names = JSON.stringify(await call('noteTypes.list', {}));
const has = (name) => names.includes(`"${name}"`);
let deckMade = false;

async function install({ name, existing, templateName, kind, fields, card, addSamples }) {
  const templates = [
    { name: templateName, questionHtml: card['front.html'], answerHtml: card['back.html'] },
  ];
  if (existing) {
    await call('noteTypes.editStructure', {
      noteType: { name: existing },
      edits: [
        {
          op: 'updateTemplate',
          name: templateName,
          patch: { questionHtml: card['front.html'], answerHtml: card['back.html'] },
        },
      ],
    });
    await call('noteTypes.update', {
      noteType: { name: existing },
      patch: { css: card['style.css'] },
    });
    console.log('Updated the', existing, 'note type.');
    return;
  }
  await call('noteTypes.create', {
    name,
    ...(kind ? { kind } : {}),
    fields: fields.map((field) => ({ name: field })),
    templates,
    css: card['style.css'],
  });
  if (!deckMade) {
    await call('decks.create', { name: DECK });
    deckMade = true;
  }
  await addSamples();
  console.log('Added the', name, 'note type and sample cards in', DECK + '.');
}

await install({
  name: 'DeepRecall-Basic',
  existing: has('DeepRecall-Basic')
    ? 'DeepRecall-Basic'
    : has(OLD_BASIC_NAME)
      ? OLD_BASIC_NAME
      : null,
  templateName: 'Write',
  fields: ['Front', 'Back'],
  card: buildCard('basic'),
  addSamples: async () => {
    for (const [Front, Back] of BASIC_SAMPLES) {
      await call('notes.create', {
        noteType: { name: 'DeepRecall-Basic' },
        deck: { name: DECK },
        fields: { Front, Back },
        tags: ['deeprecall-sample'],
      });
    }
  },
});

await install({
  name: 'DeepRecall-Cloze',
  existing: has('DeepRecall-Cloze') ? 'DeepRecall-Cloze' : null,
  templateName: 'Cloze',
  kind: 'cloze',
  fields: ['Text', 'Back Extra'],
  card: buildCard('cloze'),
  addSamples: async () => {
    for (const Text of CLOZE_SAMPLES) {
      await call('notes.create', {
        noteType: { name: 'DeepRecall-Cloze' },
        deck: { name: DECK },
        fields: { Text, 'Back Extra': '' },
        tags: ['deeprecall-sample'],
      });
    }
  },
});
