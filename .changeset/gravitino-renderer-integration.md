---
"@intent-driven/core": patch
"@intent-driven/renderer": minor
---

Рендер-интеграция 3 Gravitino-паттернов (PR #230):

- `ArchetypeDetail` прокидывает `slots.actionGates` в ctx; `IntentButton` читает gate'ы по `spec.intentId`, eval'ит `blockedWhen` против target → disabled + tooltip. Click по disabled — no-op.
- `ArchetypeCatalog` прокидывает `slots.rowAssociations` в ctx; `DataGrid` автоматически инжектит chip-column per association (перед actions), `ChipCell` резолвит junction-records + других entity + рендер через `ChipList` с attach/detach.
- `SubCollectionSection` получает fallback для `source: "derived:<id>"` — collection-key берётся из `section.collection` или pluralized `section.itemEntity`. Pattern `reverse-association-browser` теперь корректно отображает referrer-items на reference-entity detail.

Core (patch): у `reverse-association-browser` section дополнительно выставляется `itemEntity` и `collection` (pluralized, с учётом `entity.collection` override'а).
