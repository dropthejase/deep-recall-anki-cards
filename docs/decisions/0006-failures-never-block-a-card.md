# 6. Failures never block a card

Status: accepted

## Context

AI feedback depends on the network and on a provider that can be slow, down, out of credit, or reject a key. Studying must go on regardless.

## Decision

- The card works fully with AI off and with no connection.
- Every request has a time limit: 12 seconds to check a Puter token, 15 to load the Puter script, 30 for a Puter reply, 45 for Claude and OpenAI, and 120 for Ollama, which may need to load a model. A bad Puter token makes Puter wait without answering, so the card cannot rely on Puter to time out.
- The Puter script loads only after the page has finished loading, and only when it is needed.
- Offline is detected straight away.
- A failure shows a plain message and **Try again**. Nothing retries on its own.
- An Ollama model that cannot read images is caught before the request and explained. For other providers the error is explained when it comes back.

## Consequences

- A slow provider can be cut off before it answers, and the user presses **Try again**.
- Errors show the provider's own words next to the plain message, so the real cause is not hidden.
