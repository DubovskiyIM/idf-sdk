---
"@intent-driven/renderer": minor
"@intent-driven/core": minor
---

DataGrid: новые cell kinds `chipList` + `ownerAvatar` для inline-array и owner-string полей.

- `chipList` — рендерит array-of-strings (item[col.key]) как inline ColoredChip's. Принимает col.chipKind ("tag" | "policy") для preset.
- `ownerAvatar` — рендерит owner string через AvatarChip primitive. Принимает col.placeholder ("+ Set Owner").

Также обновлён pattern `entity-tag-policy-columns` (`@intent-driven/core`): использует kind `chipList` вместо `chipAssociation` (последний — для junction-table assoc и не подходит к inline-arrays типа catalog.tags=[...]).

Foundation для gravitino derived UI (catalog/schema/table/fileset/topic/model listings показывают tags/policies/owner inline без author bodyOverride).

Backward-compatible — additive, существующие projections не затронуты.
