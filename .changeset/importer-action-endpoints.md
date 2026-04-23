---
"@intent-driven/importer-openapi": minor
---

Detect action-endpoints: `/collection/{param}/action-verb` → intent на parent, не новая entity (G-K-2).

OpenAPI path'ы вида `/users/{user}/reset-password`, `/clients/{id}/test-nodes-available`, `/authentication/executions/{id}/lower-priority` — это action'ы над identified resource, а не отдельные entity. Раньше `entityNameFromPath` брал последний non-`{}` segment → материализовал `ResetPassword`, `TestNodesAvailable`, `LowerPriority` как top-level entities. В Keycloak это давало 21 лишнюю entity-запись.

Новый `detectActionEndpoint(path)` возвращает `{ parentEntity, actionSegment, actionName }` если:
1. Path ends non-`{param}` segment
2. Перед ним `{param}`
3. Segment matches verb-regex (conservative explicit list: activate/deactivate/test/reset/send/move/logout/approve/reject/...)

`pathToIntent` использует detector — для action'а intent.target = parent entity, name = `${actionName}${Parent}`, alpha = `"replace"`. `importOpenApi` step 2 (entity creation) больше не создаёт noise entities — `intent.target` уже short parent name.

Plural-suffix collections (`role-mappings`, `credentials`) не трогаются — они остаются sub-collection'ами.

## Новые exports

- `detectActionEndpoint(path) → { parentEntity, actionSegment, actionName } | null`

## Эффект Keycloak

- 21 operation-as-entity (ResetPassword / TestNodesAvailable / LowerPriority / Activate / ...) больше не попадают в ontology.entities
- ROOT_PROJECTIONS whitelist в host keycloak/projections.js можно упростить

## Тесты

`pathToIntent.test.js` — 15 новых: detectActionEndpoint (8 сценариев: Keycloak / plural exclusion / top-level / missing param / verb-list / kebab multi-dash), pathToIntent integration (4), importOpenApi integration (2).

`@intent-driven/importer-openapi`: **102 passed** (было 87, +15).
