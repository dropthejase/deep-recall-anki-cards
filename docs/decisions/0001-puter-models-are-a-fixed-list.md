# 1. Puter models are a fixed list

Status: accepted

## Context

Claude, OpenAI and Ollama have an **Other…** entry in the model list, where you type any model name. Puter does not, even though it offers about 1,000 models.

Many Puter models need options that vary from one model to the next:

- Thinking models can spend the whole 900-token reply budget on hidden reasoning and return nothing. GPT-6 Luna avoids this with `reasoning_effort: none`, but other models reject that option.
- Some models use prefixed ids (`infron:…`, `openrouter:…`) or variants, and Puter's model list only says whether a model reads images for the Claude and Gemini entries.
- A model without structured output support fails with an error that does not explain why.

One way around it is a free-text box for JSON options, but people cannot be expected to write that.

## Decision

The Puter list is a short, fixed set of models that were tried with this card: GPT-6 Luna (default), Claude Haiku 5.5, Claude Sonnet 5.5, Gemini 3.8 Flash and Qwen3.8 Flash. There is no **Other…** for Puter and no JSON options box.

## Consequences

- Every Puter model in the list works with the card's request as it is sent, with its options set in `card/_deeprecall-ai.js`.
- Someone who wants another Puter model has to edit `PROVIDERS.puter.models` in the code.
- Adding a model means trying it first (a typed and a drawn answer) and adding any options it needs.

Two options were considered and not taken: an **Other…** box with only a model id (it works for plain models and fails confusingly for the rest), and filling the list from Puter's model listing (hundreds of entries, mostly untested).
