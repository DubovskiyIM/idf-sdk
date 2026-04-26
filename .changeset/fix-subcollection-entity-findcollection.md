---
"@intent-driven/core": patch
---

documentMaterializer: resolve `subCollection.entity` через `findCollection` (closes idf backlog §13.12).

До этого fix'а `materializeDetail` искал `world[sub.collection]` (legacy plural string) — но `materializeCatalog` и canonical IDF-spec используют `findCollection(world, entity)` (pluralize entity.toLowerCase + CamelCase last-segment). CamelCase subCollections (`{entity: "Intent", foreignKey: "domainId"}`) ломались — секции выходили пустыми.

Теперь `sub.entity` приоритетнее `sub.collection`, обе формы работают. Backward-compatible: existing проекции с `sub.collection` не ломаются.

Найдено через meta-домен (idf-on-idf) — `domain_detail` с reverse-association на Intent/Projection/RRule/Witness отдавал 0 sub-sections до fix'а.
