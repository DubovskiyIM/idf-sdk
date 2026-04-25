---
"@intent-driven/renderer": minor
---

feat(renderer): SubCollectionSection inlineSource — child-collection из parent[path] без FK-lookup

K8s CRD и audit-log API часто содержат inline массивы объектов, лежащие внутри parent JSON, а не отдельной коллекцией в `world` (например, `Application.status.resources[]`, `Application.status.conditions[]`). До PR такие массивы рендерились через синтетическую entity + синтетический FK на parent (host workaround в ArgoCD).

Новая опция `section.inlineSource: "status.resources" | ["status", "resources"]` указывает SubCollectionSection резолвить items напрямую из `target[path]`, минуя `ctx.world` и `foreignKey`. Все остальные фичи секции работают идентично:

- `where`, `sort`, `terminalStatus`, `hideTerminal`
- `groupBy` / `groupNullLabel`
- `renderAs.type` (permissionMatrix / credentialEditor / eventTimeline)
- `addControl`, `itemIntents`, `editableFields`

**Совместимость**: новое поле, default-off. Существующие секции (foreignKey + source-via-world) работают без изменений (no-regression покрыт тестами).

**Безопасные defaults**:

- target=null или missing path → items=0, секция не рендерится (как пустая секция).
- Inline items без `id` получают синтетический React-key (`inline_${idx}` / `${groupKey}_${idx}`).
- Если оба `inlineSource` и `foreignKey` заданы — inlineSource побеждает (foreignKey игнорируется).

**Closes:** backlog §10.4b (ArgoCD G-A-4b). Парный с importer §10.4a (PR #306) — кристаллизатор может транслировать `entity.inlineCollections[]` в `section.inlineSource` автоматически (отдельный PR в core).

**Тесты:** 9 новых (dot-string, array form, FK-ignore, sort, where, groupBy, missing-path, target=null, missing-id). 569/569 green в renderer.
