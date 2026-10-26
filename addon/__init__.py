"""DeepRecall storage.

Desktop Anki forgets what a card keeps in its local storage when Anki closes. This add-on keeps the
DeepRecall card's settings (provider, model, the per-deck switches) and its encrypted keys in Anki's
add-on config instead, and hands them back to the card when it opens.

It only answers messages that start with "deeprecall:" from the card reviewer, only stores keys with
the prefixes below, and never makes a network request.
"""

import json
from typing import Any, Dict, Tuple

from aqt import gui_hooks, mw
from aqt.reviewer import Reviewer

COMMAND = "deeprecall:"
ALLOWED_PREFIXES = ("dr:", "ai:", "writeMode:", "puterToken")
MAX_KEY_LENGTH = 300
MAX_VALUE_LENGTH = 100_000


def _addon_name() -> str:
    return mw.addonManager.addonFromModule(__name__)


def _load() -> Dict[str, str]:
    config = mw.addonManager.getConfig(_addon_name()) or {}
    data = config.get("data")
    return data if isinstance(data, dict) else {}


def _save(data: Dict[str, str]) -> None:
    mw.addonManager.writeConfig(_addon_name(), {"data": data})


def _allowed_key(key: Any) -> bool:
    return (
        isinstance(key, str)
        and len(key) <= MAX_KEY_LENGTH
        and key.startswith(ALLOWED_PREFIXES)
    )


def _on_js_message(
    handled: Tuple[bool, Any], message: str, context: Any
) -> Tuple[bool, Any]:
    # Card pages only, and only our own messages.
    if not isinstance(message, str) or not message.startswith(COMMAND):
        return handled
    if not isinstance(context, Reviewer):
        return handled

    action, _, rest = message[len(COMMAND) :].partition(":")

    if action == "get":
        return (True, json.dumps(_load()))

    try:
        payload = json.loads(rest)
    except ValueError:
        return (True, None)
    if not isinstance(payload, dict) or not _allowed_key(payload.get("k")):
        return (True, None)

    data = _load()
    if action == "set":
        value = payload.get("v")
        if isinstance(value, str) and len(value) <= MAX_VALUE_LENGTH:
            data[payload["k"]] = value
            _save(data)
    elif action == "del":
        if payload["k"] in data:
            del data[payload["k"]]
            _save(data)
    return (True, None)


gui_hooks.webview_did_receive_js_message.append(_on_js_message)
