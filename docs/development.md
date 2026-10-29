# Development

## Layout

```
card/               the card source
  front.html          question side: writing box, drawing pad, AI settings
  back.html           answer side: your answer, the real answer, AI feedback
  style.css           styling
  _deeprecall-ai.js   shared AI code: providers, key storage, add-on storage
addon/              the optional desktop add-on (Python) and its build script
scripts/
  build.mjs           builds dist/<note type>/ (writes the shared code into both templates)
  install.mjs         adds or updates the DeepRecall-Basic and DeepRecall-Cloze note types through AnkiConnect
dist/               the built templates people copy into Anki (committed)
  deeprecall-basic/   one folder for each note type
  deeprecall-cloze/
tests/              browser tests
docs/               guides and notes
```

Anki card templates can only be a front, a back and a stylesheet, and cannot include each other. So the shared code lives in one source file and `scripts/build.mjs` writes it into both templates. Each built template is self-contained, which also means nothing has to sync as a separate media file.

## Setup

You need Node.js 22 or later.

```
npm install
npm run build      # rebuild dist/ after changing anything in card/
npm test           # tests that need no accounts, keys or local models
npm run format     # prettier
```

`dist/` is committed so people can copy the files without running anything. `npm test` fails if `dist/` is out of date.

Install into your own Anki (AnkiConnect add-on needed, Anki open, no Browse or editor windows open):

```
npm run install:card
```

## Note types from one source

Every note type is built from the same files in `card/`. `VARIANTS` in `scripts/build.mjs` lists, for each one, its name, its fields, where it is written, and the few lines of the Basic templates that change. Cloze changes the question to `{{cloze:Text}}` and replaces the `{{Back}}` line with an empty answer block (`data-cloze-answer`) and `{{Back Extra}}`. The back template fills that block from the cloze spans Anki puts in the question, and gives the model the question with each span turned back into `[...]`. The build fails if a line it should change is no longer in the source.

To add a note type, add a variant, run the build, and add it to `scripts/install.mjs`. `tests/build-check.mjs` picks it up by itself.

## Tests

They load the **built** templates in a real browser (Playwright, Chromium) with the card's `{{Front}}`, `{{Back}}` and `{{Deck}}` filled in. For Cloze, `{{cloze:Text}}` is filled in the way Anki renders it: a `[...]` span on the question side and the hidden words in a span on the answer side.

| File                  | What it checks                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `build-check.mjs`     | `dist/` is current; every script parses                                                                                            |
| `crypto.mjs`          | The key store: nothing readable in storage, new salt and IV each time, a changed record or wrong passphrase refused                |
| `cloud.mjs`           | Claude and OpenAI keys: encrypted storage, locking, forgotten passphrase, request shapes (the provider servers are made up)        |
| `breadcrumb.mjs`      | The deck name above the question: the last three levels, or all when there are fewer                                               |
| `cloze.mjs`           | The Cloze note type: a blank on the question, the hidden words as the answer, `Back Extra` under it, and the model given the blank |
| `drawing.mjs`         | Ignore finger: a finger does not draw when it is on, a mouse or pen still does, and the setting is remembered                      |
| `ollama-address.mjs`  | An Ollama address that is not on this computer is refused and nothing is sent to it                                                |
| `lmstudio-mock.mjs`   | LM Studio against a pretend server: models listed, embedding models hidden, text-only blocked, other addresses refused             |
| `text-only-model.mjs` | A model that cannot read images never blocks the card                                                                              |
| `addon.mjs`           | Settings and keys survive a "restart" through a stand-in for the add-on                                                            |
| `ollama.mjs`          | **Needs Ollama running.** Typed and drawn answers against a real local model: `OLLAMA_MODEL=gemma4:e4b npm run test:ollama`        |
| `lmstudio.mjs`        | **Needs LM Studio running** with the server and CORS on: `LMSTUDIO_URL=http://localhost:1234 npm run test:lmstudio`                |

What is **not** automated: real calls to Puter, Claude and OpenAI (they need keys and cost money; they were run by hand), the Python add-on inside real Anki, and touch, stylus and scrolling on real phones.

First run only: `npx playwright install chromium`.

## How AI feedback works

1. The front saves what you wrote (text, and for drawings two pictures) under temporary keys.
2. The back reads them and calls `DRAI.grade({ system, user, schema, image })` from `card/_deeprecall-ai.js`.
3. `grade` picks the active provider and model from the saved settings, checks a key is available, and sends one request. It returns the parsed result or throws an error with a `kind` that `DRAI.explain` turns into a plain sentence.
4. Failures never block the card: they show a message and a **Try again** button.

The grading prompt (`SYSTEM` and `HANDWRITING` in `card/back.html`) tells the model how to mark. It is the part most worth tuning, so test a change on both typed and handwritten answers.

## Deck name above the question

The card shows the last three levels of the deck name. To show more or fewer, change `CRUMB_LEVELS` in both `card/front.html` and `card/back.html`, then run `npm run build`. If it is larger than the number of levels the deck has, the whole name is shown. Saved settings always use the full deck name.

## Adding a provider

1. Add an entry to `PROVIDERS` in `card/_deeprecall-ai.js` (label, whether it needs a key, models, timeout).
2. Add a `viaYourProvider` function next to `viaClaude`, and call it from `grade`.
3. Add a free key check to `verifyKey` if the provider has one.
4. Add the connection to the privacy and threat-model docs, and a test in `tests/cloud.mjs` with a made-up server.
5. Run `npm run build` and `npm test`.

## Releasing

1. Update `CHANGELOG.md` and the version in `package.json`.
2. `npm run build && npm run build:addon && npm test`.
3. Commit, tag (`v0.1.0`), push the tag. The release workflow attaches `deeprecall.ankiaddon`.

## Conventions

- Template scripts use plain `var` and functions (no modules, no `DOMContentLoaded`), because Anki runs them inline on every card show.
- Never log or display a key. Error messages must not contain headers.
- Keep Anki card JavaScript working in older web views: no build step transpiles it.

## Decisions

Choices that are not obvious from the code are recorded in [`docs/decisions`](decisions/).
