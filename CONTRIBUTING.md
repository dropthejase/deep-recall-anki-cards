# Contributing

For anything bigger than a small fix, open an issue first so we agree on the approach.

## Making a change

1. Run `npm install`, then make your change in `card/`, `addon/`, `scripts/` or `docs/`.
2. If you changed `card/`, run `npm run build` and commit the updated `dist/`.
3. Make sure `npm test` and `npm run format:check` pass.
4. In the pull request, say what changed, why, and how you tested it, including the Anki version and device if they matter.

Reports from devices not yet tested (AnkiDroid and Linux) are welcome, as are clearer docs and new providers (see [development](docs/development.md#adding-a-provider)).

## Rules

- Never commit a key, token or `.env` file, and never paste one in an issue or pull request.
- A change that adds a network request needs a note in [privacy](docs/privacy.md) and the [threat model](docs/threat-model.md).
- The card must keep working when AI is off and when a provider fails.
- Contributions are released under the [MIT licence](LICENSE).

Report security problems through [SECURITY.md](SECURITY.md), not in public. Be kind and assume good faith; harassment is not welcome.
