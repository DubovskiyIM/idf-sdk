---
"@intent-driven/core": patch
---

`subcollections` pattern apply теперь возвращает render-ready section shape.

До этого auto-derived sections имели thin-shape:
```js
{ id, entity, foreignKey, layout, intents, source: "derived:subcollections" }
```

Renderer ожидает `{title, itemEntity, itemView, itemIntents}` (как у `buildSubSection` в `assignToSlotsDetail.js`) — получал `undefined`, рендерил пустые заголовки + unknown-entity списки. Регресс виден на Gravitino: `user_detail` / `role_detail` / `group_detail` имели sections с пустыми headers.

Fix: `buildSection` в `subEntityHelpers.js` теперь добавляет:
- `title` — humanized entity name (`OrderItem` → `"Order item"`)
- `itemEntity` — alias для `entity` (renderer-preferred name)
- `itemView` — minimal text-bind на primary-title поле (с fallback на `name`/`title`/`label`, потом `id`)
- `itemIntents` — alias для `intents`
- `emptyLabel` — default `"Пока пусто"`

Backward compat: legacy `entity`/`intents` поля сохранены (удалим в major). Author override через `projection.subCollections` — этот path вообще не изменился.

**Обнаружено:** Gravitino dogfood-спринт 2026-04-23 Stage 2 Task 1 discovery (docs/gravitino-gaps.md G14 / ux-patterns-notes P-3).

**Tests:** +3 unit (title/itemEntity/itemView populated, fallback на id, humanize multi-word). 1184/1184 core tests pass.
