---
"@intent-driven/core": minor
---

Fix G-K-22: новый `ontology.features.preferDataGrid` switch для
catalog-default-datagrid pattern. Closes admin-CRUD use-case где
host-author хочет таблицу но catalog-action-cta уже добавил
per-row intents → pattern avoid'ит trespass и оставляет card-list.

Default behavior unchanged: `body.item.intents.length > 0` →
catalog-default-datagrid skip apply (card-with-actions wins).

Switch behavior (`ontology.features.preferDataGrid: true`):
- Skip card-with-actions guard
- Synthesize DataGrid + actions-column из `body.item.intents`
- Format conversion: catalog-action-cta `{intentId, opens, overlayKey, icon}`
  → ActionCell `{intent, label, params, danger}`
- Auto-label: `update*` → "Изменить", `remove*` → "Удалить",
  `read*` → "Открыть"
- ActionCell auto-detect form-confirmation (G-K-24, #267) → openOverlay сама
- `danger:true` для remove* (red)

Discovered в Keycloak dogfood-спринте 2026-04-23 — host workaround
(9 manual `bodyOverride: dataGridBody(...)` declarations в
`keycloak/projections.js`) можно удалить через
`ontology.features.preferDataGrid: true` + ontology.witnesses
(уже задекларированы для всех catalog'ов).

Backward-compat: existing domains (Gravitino / freelance / sales) —
default unchanged.
