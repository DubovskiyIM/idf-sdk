---
"@intent-driven/core": minor
---

feat(patterns): trigger.kind `co-selection-group-entity` для cross-projection паттернов

Новый trigger kind в `patterns/schema.js` — validates group-entity shape:
entity с (а) array-valued entity-ref field (visual members) + (б) self-reference
(иерархия папок/групп). Первый из трёх promotion-gate'ов для
`bidirectional-canvas-tree-selection` (candidate → stable).

Supported field shapes для `memberField`:
- `{ type: "entityRefArray", references: "Target" }`
- `{ type: "entityRef[]", references: "Target" }`
- `{ references: "Target", array: true }` / `multi: true`
- `{ entityRef: "Target", array: true }` / `many: true`

Supported shapes для `parentField`: `{ references | entityRef: "<self>" }`.

Оба поля auto-detected (scan), либо заданы явно через `req.memberField` /
`req.parentField`.

13 новых тестов: canonical + shorthand + `entityRef[]` variants, 4
negative-cases (нет array-ref, нет self-ref, scalar FK, bogus array без
references), explicit memberField/parentField happy + mismatch, validatePattern
accepts new kind. 1320/1320 core tests зелёные.
