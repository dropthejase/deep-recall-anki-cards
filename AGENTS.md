# AGENTS.md

DeepRecall is an Anki note type: a card where you write or draw an answer, with optional AI feedback. The card runs inside Anki's web view and has no server. Read [docs/development.md](docs/development.md) for the layout and [docs/threat-model.md](docs/threat-model.md) before touching keys, storage or network code.

## Commands

```
npm install
npm run build        # rebuild dist/ after any change in card/
npm test             # browser tests; needs no accounts, keys or local models
npm run format       # prettier
npm run test:ollama  # needs Ollama running
npm run test:lmstudio  # needs LM Studio running with the server and CORS on
npm run build:addon  # makes addon/deeprecall.ankiaddon
npm run install:card # needs Anki open with the AnkiConnect add-on
```

## Rules

- `dist/` is built from `card/` and committed. Run `npm run build` after changing `card/`; `npm test` fails if it is stale.
- Run `npm test` and `npm run format:check` before finishing.
- Never commit a key, token or `.env` file, and never print one.
- A change that adds a network request needs an update to `docs/privacy.md` and `docs/threat-model.md`. With AI feedback off the card makes no requests at all.
- The card must keep working when AI is off and when a provider fails or is slow.
- Card scripts use plain `var` and functions, with no modules and no build step, because Anki runs them inline on every card.
- The note type fields are `Front` and `Back`. Do not rename them.
- Record choices that are not obvious from the code as a numbered file in `docs/decisions/`.

## Writing docs

Plain, short sentences in ordinary prose. Lists for steps and reference only. No filler, no marketing words, and no names of people or references to other projects. Check that links still resolve.

## Gotchas

- Files may be CRLF in a Windows working copy. `.gitattributes` stores them as LF.
- AnkiConnect refuses note-type changes while Anki's Browse, Add or editor windows are open.
