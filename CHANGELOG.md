# Changelog

## 0.2.0 (2026-10-29)

- A `DeepRecall-Cloze` note type (fields `Text` and `Back Extra`) for cloze cards. The question hides the words, the answer side lists them as the answer, and the model marks what you typed against those words. Cloze notes you already have can be moved over with **Change Note Type**, because the field names match Anki's own Cloze.
- The Basic note type is now called `DeepRecall-Basic`. Rename an existing `DeepRecall` note type in Anki (**Tools → Manage Note Types → Rename**); its notes and fields are untouched. The install command still finds the old name.
- The built templates are now in one folder for each note type: `dist/deeprecall-basic/` and `dist/deeprecall-cloze/`. The Basic files used to be directly in `dist/`. The release attaches both sets, named for the note type.

## 0.1.0 (2026-10-26)

First public version.

- The `DeepRecall` note type: type your answer, or write it by hand with a finger, pen or mouse on a sheet that expands. Your answer is shown above the real answer, and your Type or Draw choice is remembered per deck.
- Optional AI feedback with Puter, Claude, OpenAI, Ollama or LM Studio, switched on per deck. Each provider has its own model choice and saved key, keys are encrypted with a passphrase, and a model that cannot read images never blocks the card.
- **Ignore finger** for touch screens, so a palm does not draw while you write with a pen.
- The card uses system fonts and makes no network requests while AI feedback is off.
- Ollama and LM Studio are only reached on this computer, so a rewritten setting cannot send answers to another server.
- An optional desktop add-on so desktop Anki keeps its settings and encrypted keys across restarts.
- Install and AI setup guides, privacy notes, a threat model and a security policy.

Tested with real services: Puter (GPT-6 Luna and Claude Haiku 5.5 on handwriting, Gemini 3.8 Flash and Qwen3.8 Flash on simple block letters), Claude Haiku 5.5, OpenAI (GPT-5 mini and GPT-6 Luna), Ollama (`gemma4:e4b`) and LM Studio (`qwen/qwen3.5-9b`), with typed and handwritten answers. Platforms: Anki for Windows, Anki on Mac (Ollama), and AnkiMobile on iPhone and iPad, including a stylus with **Ignore finger**. The desktop add-on was checked in Anki for Windows. Only the Basic note type was tested.

Not yet tested: AnkiDroid, Linux, Puter's Claude Sonnet 5.5, and OpenAI's GPT Sol 6.1 and GPT-5.5 on images.
