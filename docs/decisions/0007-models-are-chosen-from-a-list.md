# 7. Models are chosen from a list, with Other… for the rest

Status: accepted

## Context

Typing a model name invites typos and models that cannot read images or follow the card's output format. Model names also change often, and what is installed in Ollama differs from person to person.

## Decision

Every provider offers a list, and most also allow any name:

| Provider | List                                                           | Other…                                                       |
| -------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| Puter    | A fixed set that was tried with the card                       | No (see [decision 1](0001-puter-models-are-a-fixed-list.md)) |
| Claude   | A short set, cheapest first                                    | Yes                                                          |
| OpenAI   | A short set, cheapest first                                    | Yes                                                          |
| Ollama   | The models installed on this computer, read from Ollama itself | Yes                                                          |

For Ollama, models that Ollama says cannot read images are labelled "text only" and can still be chosen, because typed answers work with them. **Other…** covers a model that is not installed yet, or any case where the list cannot be read.

Defaults are the cheap, quick choice for each provider: GPT-6 Luna for Puter and OpenAI, Claude Haiku 5.5 for Claude, and the first installed model that can read images for Ollama.

## Consequences

- Most people never type a model name, so typos and unsuitable models are rare.
- The lists need updating when models change, in `PROVIDERS` in `card/_deeprecall-ai.js`.
- A name typed under **Other…** is not checked. If it is wrong, the provider's error is shown.
- The Ollama list needs Ollama running. When it cannot be reached, the card says so and **Other…** still works.
