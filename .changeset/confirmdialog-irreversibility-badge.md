---
"@intent-driven/renderer": minor
---

ConfirmDialog: поддержка `__irr`/`irreversibility:"high"` + configurable
`confirmLabel` + корректный default tone.

**Before:** hardcoded label "Удалить" вне зависимости от семантики (абсурдно
для `confirm_deal`, `accept_result` и других non-destructive high-irr intents).
Нет warning panel с reason.

**Changes:**
- `spec.confirmLabel` — явный override текста кнопки.
- Default label: "Подтвердить" для `α ∈ {add, replace}`; "Удалить" для
  `α:"remove"` или `spec.danger:true`.
- `spec.irreversibility === "high"` ИЛИ `spec.__irr.point === "high"` ИЛИ
  `item.__irr.at !== null` → рендер warning panel с иконкой ⚠️ и `reason`
  (если задан в `spec.__irr.reason` / `item.__irr.reason`).
- Button tone: danger-red только для `isDestructive` (α='remove' или danger:true);
  иначе — primary-blue для high-irr подтверждений.

Закрывает freelance backlog §3.3 для confirm-dialog pathway.
