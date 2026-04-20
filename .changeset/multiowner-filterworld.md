---
"@intent-driven/core": minor
---

`filterWorldForRole` поддерживает `entity.owners[]` multi-owner — row visible когда совпадает любое из owner-полей с `viewer.id`. Новый export `getOwnerFields(entity, intent?)` в `crystallize_v2/ontologyHelpers.js` унифицирует resolve: `entity.owners[]` > `entity.ownerField` (legacy) > `[]`; с `intent.permittedFor` — subset фильтр.

Backward compat: legacy single `ownerField` работает через тот же util (возвращает массив из одного). Существующие 10 доменов не требуют миграции.

`assignToSlotsDetail.js` переиспользует новый util (удалена дубликатная inline `resolveOwnerFields`).

Закрывает `docs/sdk-improvements-backlog.md` §3.2 полностью (ранее было реализовано только в `ownershipConditionFor` для detail toolbar, но не в viewer-scoping).
