# DeepRecall for Anki

The **DeepRecall Anki card template** that allows you to utilise more tactile forms of active recall.

> [!WARNING]
> Only the two note types listed under [Supported note types](#supported-note-types) work. Other note types, including image occlusion, are not supported.

## Features

- Type your answer, or ✍️ write it by hand on a touch screen, then flip the card and see yours right above the real one.
- Switch on **AI feedback** to receive AI-generated feedback of your answer compared to the card's reference answer. **Current providers supported**: Puter, Anthropic, OpenAI, Ollama and LM Studio

https://github.com/user-attachments/assets/c254b503-18a9-4756-9154-641c250ec875

## Supported note types

| Your cards                              | Note type          | Fields               | Files to use                                     |
| --------------------------------------- | ------------------ | -------------------- | ------------------------------------------------ |
| Question and answer (like Anki's Basic) | `DeepRecall-Basic` | `Front`, `Back`      | [`dist/deeprecall-basic`](dist/deeprecall-basic) |
| Fill in the blank (like Anki's Cloze)   | `DeepRecall-Cloze` | `Text`, `Back Extra` | [`dist/deeprecall-cloze`](dist/deeprecall-cloze) |

A reversed card works if you add a second card type to `DeepRecall-Basic` with `Front` and `Back` swapped in its templates. Image occlusion, "type in the answer" and note types with other fields are not supported.

## Install

Follow the [install guide](docs/install.md).

To use AI feedback, follow the [AI setup guide](docs/ai-setup.md).

## Things to know

- AI-generated feedback can be wrong.
- AI-generated feedback quality may differ between models.
- If you use a cloud-hosted provider such as Puter, OpenAI or Anthropic, the question, the reference answer and what you wrote are sent to that provider. See [privacy](docs/privacy.md).
- Keys are stored on your device, encrypted with a passphrase. A card from an untrusted deck could still try to read them, so import only decks you trust and use keys with a spend limit. See the [threat model](docs/threat-model.md).
- Desktop Anki forgets the card's settings when it closes unless you install the [desktop add-on](docs/ai-setup.md#desktop-add-on).

## Status

Tested with Basic and Cloze cards. Cloze has so far only been tried in Anki for Windows with a local model. Not yet tested on AnkiDroid or Linux. If something does not work, see [troubleshooting](docs/troubleshooting.md).

## Documentation

[Install](docs/install.md) · [AI setup](docs/ai-setup.md) · [Troubleshooting](docs/troubleshooting.md) · [Privacy](docs/privacy.md) · [Threat model](docs/threat-model.md) · [Development](docs/development.md) · [Changelog](CHANGELOG.md)

## Disclaimer

**Use at your own risk.** DeepRecall is free, open-source software provided "as is" and "as available", without warranty of any kind, express or implied, including any warranty of security, fitness for a particular purpose or non-infringement. See the [MIT licence](LICENSE).

To the fullest extent the law allows, the authors and contributors are not liable for any loss or damage arising from installing or using DeepRecall, including the loss or theft of API keys, charges from AI providers, exposure of your data, loss of Anki data or settings, or any problem caused by a deck, add-on or service you use with it.

By installing it you accept the following.

- **Security.** It stores API keys on your device and runs script inside Anki's web view. The [threat model](docs/threat-model.md) lists the risks, including that a malicious deck can read stored keys. You are responsible for protecting your keys, setting spend limits, revoking a key you think has leaked, and choosing which decks you import.
- **AI and other services.** With AI feedback on, your question, the real answer and what you wrote are sent to the provider you choose, under that provider's terms. The authors do not control Puter, Anthropic, OpenAI, Ollama, LM Studio or any other service. AI output can be wrong, so do not rely on it for professional, legal, medical, financial or exam decisions.
- **Costs.** You pay whatever your provider charges.
- **Your data.** DeepRecall changes Anki note types and, with the desktop add-on, stores settings in Anki's folder. Back up your Anki collection before installing.
- **No support.** The authors have no obligation to fix, update or support it.

This is an independent project. It is not affiliated with or endorsed by Anki, AnkiWeb, AnkiConnect, Puter, Anthropic, OpenAI, Ollama, LM Studio, Google or any other company named here, and all names and trademarks belong to their owners.
