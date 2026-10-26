# 5. The shared code is written into both templates

Status: accepted

## Context

An Anki card type is a front template, a back template and a stylesheet, and templates cannot include each other. Both sides need the same AI code. The first version put it in a file in Anki's media folder and loaded it with a script tag. After syncing, a phone could not find the file.

## Decision

The shared code lives in one source file, `card/_deeprecall-ai.js`. `scripts/build.mjs` writes it into both templates and puts the results in `dist/`, which is committed so people can copy the files without running anything. A test fails if `dist/` is out of date.

## Consequences

- Each built template is self-contained, so nothing has to sync as a separate file.
- The code appears twice, once in each template.
- After any change in `card/`, `dist/` must be rebuilt.
