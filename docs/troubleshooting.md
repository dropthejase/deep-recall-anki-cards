# Troubleshooting

## The card shows no writing box

The templates were not pasted completely, or the styling is missing. Open **Tools → Manage Note Types**, select your DeepRecall note type and click **Cards**. Check that the front template, back template and styling match the files in [`dist/deeprecall-basic`](../dist/deeprecall-basic) (or [`dist/deeprecall-cloze`](../dist/deeprecall-cloze) for cloze), and save. The fields must be named `Front` and `Back` for Basic, and `Text` and `Back Extra` for Cloze.

## My answer is gone on the answer side

The card keeps what you wrote while you turn it over. Some older Anki versions and phone apps reload the page and lose it, so update Anki or AnkiMobile. If it still happens, open an issue with your Anki version and device.

## "Add your … on the question side"

No key is saved for the provider you chose. Tick **AI feedback** on the question side, open **Settings** and add the key.

## "Your key is locked"

Anki has restarted since you saved the key. Open **Settings** on the question side, type your passphrase and press **Unlock**.

## I forgot my passphrase

Open **Settings** and press **Forgot passphrase? Remove key** (**Remove token** for Puter). Add the key again with a new passphrase. If you no longer have the key, create a new one on the provider's site.

## Settings are gone after I restart Anki on a computer

Desktop Anki forgets the card's storage when it closes. Install the [desktop add-on](ai-setup.md#desktop-add-on).

## "Could not reach …"

Your internet connection is down or the provider cannot be reached. For Ollama, check that it is running and the address is right; if it still fails, see the `OLLAMA_ORIGINS` note in the [AI setup guide](ai-setup.md#ollama). For LM Studio, check that **Local API server** and **CORS** are on in **Settings** → **Local Model API** and the address matches the Base URL; see the [AI setup guide](ai-setup.md#lm-studio).

## "The … address must be on this computer"

The card only talks to Ollama and LM Studio on your own computer, for example `http://localhost:11434` or `http://localhost:1234`. Open **Settings** and change the address back.

## "… did not accept your key"

The key is wrong, expired or revoked. Create a new one and replace it in **Settings**. For OpenAI, check that the key has **Model capabilities → Request**.

## "Your Puter allowance for this month is used up" or "no credit left"

Your free allowance or credit is spent. Feedback returns when the allowance resets or you add credit.

## "This model cannot read images"

You drew an answer with a model that cannot see pictures. Type your answer, or pick a model that reads images in **Settings**.

## "No handwritten answer is visible"

The model could not read your drawing. Write larger, slower and with clear gaps between words. **What the AI saw** on the answer side shows the picture it received.

## The installer says Anki refused the write

Close any Browse, Add or note-editor windows. AnkiConnect will not change note types while they are open.

## Anki says "Corrupt add-on file"

A `.ankiaddon` file must be a zip with the files at its top level. Use the file from the release, or rebuild it with `npm run build:addon`.

## Still stuck

Open an issue with your Anki version, your device and what the card shows. Never paste a key or token into an issue.
