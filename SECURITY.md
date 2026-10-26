# Security policy

## Reporting a vulnerability

Report it privately: on GitHub, open the **Security** tab and choose **Report a vulnerability**. Include what you found, how to reproduce it, and your Anki version and device. Never include a real key or token.

This is a small hobby project, so there is no fixed response time and no bounty. Only the latest release gets fixes.

## What counts

- A saved key, token or passphrase exposed to something it should not be.
- The add-on storing or running something it should not.
- Anything that sends data somewhere not listed in [privacy](docs/privacy.md).

The [threat model](docs/threat-model.md) lists known limits, such as a malicious card in the same Anki being able to read stored keys. Those are design limits rather than vulnerabilities, but ideas for reducing them are welcome.
