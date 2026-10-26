# 2. Each provider keeps its own key

Status: accepted

## Context

Claude and OpenAI show an API key once, when it is created. If the card stored a single key, switching from a paid provider to Ollama and back would mean pasting the key again, and a lost key means making a new one.

## Decision

Every provider has its own saved key, and a separate setting says which provider is active. The model choice is also kept per provider. **Remove key** deletes only that provider's key.

## Consequences

- Switching providers never loses a key.
- More keys sit on the device, so a leak could expose more than one. The passphrase and the advice to use spend-limited keys limit the damage (see [decision 3](0003-keys-are-encrypted-with-a-passphrase.md)).
- Keys for providers you stop using stay until you remove them.
