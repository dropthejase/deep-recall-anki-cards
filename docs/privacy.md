# Privacy

DeepRecall has no server, no account and no analytics. This page lists everything that leaves your device.

## With AI feedback off

The card makes no network requests. It uses the fonts already on your device.

What you type or draw stays on your device. It is kept briefly so it survives turning the card over, and it is cleared when the next question starts.

## With AI feedback on

Each time an answer is marked, the card sends the provider you chose:

- the question and the real answer from your note,
- what you wrote, as text or as a picture of your drawing (cropped, on white, no longer than 512 pixels),
- the grading instructions, and your key or token.

| Provider  | Where it goes                             | Notes                                                                                                                         |
| --------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Puter     | `api.puter.com`, then the model's company | The Puter script loads from `js.puter.com` only when you use Puter. Puter and the model company have their own privacy terms. |
| Claude    | `api.anthropic.com`                       | Straight from your device to Anthropic.                                                                                       |
| OpenAI    | `api.openai.com`                          | Straight from your device to OpenAI.                                                                                          |
| Ollama    | `localhost`                               | Stays on your computer. The card refuses any other address.                                                                   |
| LM Studio | `localhost`                               | Stays on your computer. The card refuses any other address.                                                                   |

Providers may keep requests under their own policies. If your cards hold personal, confidential or exam-restricted material, use Ollama or LM Studio, or leave AI feedback off.

## What is stored on your device

| What                                                       | Where                                                          | Removed when                               |
| ---------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| Provider, model, local server addresses, per-deck switches | The card's local storage, and the add-on's config if installed | You clear Anki's data or remove the add-on |
| Saved keys and tokens, encrypted with your passphrase      | The same places                                                | You press Remove, or clear Anki's data     |
| The unlocked key                                           | The card's session memory                                      | Anki closes                                |
| Your answer on the current card                            | The card's session and local storage                           | The next question starts                   |

Keys are never put in your notes, so they are not synced to AnkiWeb or included in a deck you share. Settings stay on the device that made them.

## Third parties

Anki and AnkiWeb, Puter, Anthropic, OpenAI, Ollama and LM Studio are separate services with their own terms and privacy policies. This project does not control them.
