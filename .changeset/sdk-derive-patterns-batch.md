---
"@intent-driven/core": minor
---

U-derive Phase 2 — 4 stable pattern bank entries для derived UI:

- `entity-row-actions` (catalog) — auto-добавляет `_actions` column в dataGrid когда есть intent'ы modifier (replace/remove) targeting mainEntity. Reduces host boilerplate.
- `entity-tag-policy-columns` (catalog) — adds Tags + Policies columns с `chipAssociation` kind когда entity ontology имеет оба field'а. Insert после `name`.
- `entity-owner-column` (catalog) — adds Owner column с `ownerAvatar` kind когда entity имеет owner field. Insert перед tags если tags есть.
- `metadata-objects-reverse-lookup` (cross) — derived source для tag/policy detail. `subCollections.source = "derived:metadata-objects-by-tag|policy"` → scan'ит world и populate items с `{entityType, collectionKey, entity, fullName}`.

Foundation для Phase 3 (gravitino host refactor — drop ~30 components, declarative projections).

Backward-compatible — все additive, не меняет существующий API. Author override через `projection.bodyOverride` или existing `_actions`/`tags`/`owner` columns.
