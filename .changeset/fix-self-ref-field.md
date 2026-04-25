---
"@intent-driven/core": patch
---

fix(patterns): resource-hierarchy-canvas — findSelfRefField распознаёт IDF importer FK convention

Исправляет ошибку в `findSelfRefField`: не матчил поля вида `{ type: "entityRef", kind: "foreignKey", references: "Entity" }` — это стандартный формат IDF importer-openapi для foreign key полей (в отличие от прямого `type:"foreignKey"`).

Также добавлена поддержка `parent<EntityName>` convention (без Id-суффикса, пример: `parentResource` в ArgoCD Resource entity) параллельно с существующим `parent<EntityName>Id`.

Praktический эффект: ArgoCD `Resource.parentResource` теперь корректно детектируется как self-referential FK, что позволяет паттерну auto-derive `renderAs:{type:"resourceTree"}` для Resource subCollection без host-workaround.
