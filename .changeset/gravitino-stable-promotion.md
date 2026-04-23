---
"@intent-driven/core": minor
---

Промоция 3 stable-паттернов из Gravitino candidate bank (PR #229):

- `detail/lifecycle-gated-destructive` — two-phase delete (disable → remove). Apply кладёт gate в `slots.actionGates` с `blockedWhen`-expression. Trigger: enum-status с ≥2 опций ИЛИ boolean-lifecycle поле, + парные disable/remove intents.
- `catalog/inline-chip-association` — m2m chip+X inline в catalog row. Apply добавляет запись в `slots.rowAssociations` per junction (assignment-kind + парные attach/detach intents).
- `detail/reverse-association-browser` — на detail reference-entity секция «кто ссылается». Apply добавляет `sections` `kind: "reverseM2mBrowse"` с автоматическим `groupBy` для polymorphic junctions (`objectType` / `entityType` / `kind`).

Stable count: 33 → 36.
