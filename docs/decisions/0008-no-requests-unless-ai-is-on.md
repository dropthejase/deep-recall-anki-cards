# 8. The card makes no requests unless AI feedback is on

Status: accepted

## Context

The first version loaded the Inter font from Google Fonts, so every card view sent a request to Google even with AI feedback off. That contradicted the claim that nothing leaves your device unless you turn AI on.

## Decision

The card uses only fonts already on the device, in a stack that reads like Helvetica: the system UI font on Apple devices, then Helvetica Neue, Helvetica, Arial, Segoe UI and Roboto. Nothing else is loaded from the internet. The Puter script loads only when AI feedback is on and Puter is the provider.

## Consequences

- With AI feedback off, the card makes no network requests.
- The typeface differs a little between devices.
- Nothing needs a font licence or a third-party notice.
