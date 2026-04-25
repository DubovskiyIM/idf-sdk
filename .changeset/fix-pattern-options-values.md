---
"@intent-driven/core": patch
---

fix(patterns): dual-status-badge-card + resource-hierarchy-canvas поддерживают fieldDef.options наравне с fieldDef.values

Trigger и apply обоих паттернов проверяли только `fieldDef.values`, но importer-openapi и ArgoCD ontology используют `fieldDef.options` (конвенция OpenAPI `enum`). Добавлен fallback: `fieldDef.values ?? fieldDef.options`.

Затрагивает:
- `looksLikeStatusField` в обоих паттернах
- `pickStatusWitnesses.values` в `dual-status-badge-card`
- `findStatusFields.values` в `resource-hierarchy-canvas`

Без этого fix'а паттерны не матчили ArgoCD Application/Resource entities (которые используют `type: "select", options: [...]` вместо `type: "string", values: [...]`).
