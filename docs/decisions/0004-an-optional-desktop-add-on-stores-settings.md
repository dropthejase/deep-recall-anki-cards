# 4. An optional desktop add-on stores settings

Status: accepted

## Context

Desktop Anki does not keep a card's local storage after it closes, so every restart loses the provider, model, saved keys, per-deck switches and Type/Draw choices. On a phone they are kept.

## Decision

A small Python add-on (`addon/`) saves those settings in Anki's add-on config and returns them when a card opens. The card talks to it through Anki's `pycmd` channel. The add-on answers only `deeprecall:` messages from the review screen, stores only entries with known name prefixes, and makes no network requests. Without it the card works as before.

It is installed from a `.ankiaddon` file attached to a GitHub release, not from AnkiWeb, so the code can be read first.

## Consequences

- Computers need one extra install for settings to last.
- The encrypted keys sit in the add-on's `meta.json`, readable by anyone with access to Anki's folder.
- Settings do not sync between devices.
- It has been checked by hand in Anki for Windows only.

Not chosen: writing the settings into the note type's templates at install time (changing a key would need the installer to be run again), and calling AnkiConnect from the card (it would put an open local API on the card's path).
