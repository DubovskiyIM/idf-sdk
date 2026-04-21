---
"@intent-driven/core": minor
---

patterns/optimistic-replace-with-undo: добавлен `structure.apply(slots, context)`.

Паттерн triggers на ≥3 replace-click intents без `irreversibility:high/extreme` и emit'ит `{type:"undoToast", intentId, inverseIntentId, windowSec, message?}` в `slots.overlay` для каждого candidate'а с явным `inverseIntent` / `antagonist`. Shape совместим с `undo-toast-window` — primitive `UndoToast` (renderer) рендерит обе формы одинаково; overlap между паттернами защищён идемпотентностью по `intentId`. Respects `projection.undoToast === false`, `intent.undoable === false`, overrides `intent.undoWindowSec` / `projection.undoWindowSec` (default 5 сек).

После этого изменения остаются 2 matching-only паттерна из 31 stable: `global-command-palette`, `keyboard-property-popover`.
