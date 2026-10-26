# 3. Keys are encrypted with a passphrase

Status: accepted

## Context

A card keeps its data in local storage, and every card in the same Anki can read it. Cards have no access to the system keychain. Asking for a passphrase on every request would be tedious.

## Decision

Keys and tokens are encrypted with AES-256-GCM, using a key derived from the user's passphrase with PBKDF2-SHA256 (600,000 rounds, a random salt and IV for each key). The user types the passphrase once each time Anki starts, and the decrypted key then stays in session memory until Anki closes.

**Remove key** works without the passphrase, so a forgotten passphrase never locks anyone out. A Puter token saved before passphrases existed keeps working and can be encrypted in place with **Protect with a passphrase**.

## Consequences

- A copied backup or add-on config file does not reveal a key without the passphrase, although a weak passphrase can be guessed.
- While a key is unlocked, a script in any card in the same Anki can read it. This is an accepted risk, described in the [threat model](../threat-model.md), and the advice to import only trusted decks and use spend-limited keys is the main defence.
- A lost passphrase cannot be recovered. The key has to be removed and added again.

Not chosen: storing keys as plain text (anyone reading the files gets the key), and asking for the passphrase on every request (an optional mode for this is planned).
