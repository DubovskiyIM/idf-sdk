---
"@intent-driven/core": minor
---

Promote `catalog-default-datagrid` из candidate → stable с `structure.apply`.

**Host impact:** CRUD-admin catalog-проекции без visual-rich signals (image/multiImage/≥3 money-percentage-trend metrics) автоматически рендерятся как tabular DataGrid. **Автор больше не пишет `bodyOverride.columns` руками** — `catalog-default-datagrid.apply` выводит columns из `projection.witnesses` + `ontology.field.type/values`:

- `string` / `text` → sortable + filterable (text input)
- `enum` / `field.values` → sortable + `filter: "enum"` с `values`
- `boolean` → sortable + `filter: "enum" [true, false]`
- `number` / `decimal` / `int` → sortable
- `image` / `multiImage` / `json` / `richText` / `fieldRole: heroImage|avatar` → skipped

### Apply precedence (respects earlier patterns & author-override)

Pattern **no-op** если:
- `slots.body.type === "dataGrid"` (author или earlier pattern уже задал)
- `slots.body.layout === "grid"` (grid-card-layout сработал — visual-rich entity)
- `projection.bodyOverride` present (author-level override)
- `slots.body.item.intents.length > 0` (catalog-action-cta / другой pattern owns body)

### Host migration (optional — pattern работает автоматически)

Было:
```js
metalake_list: catalog("Metalake", "Metalakes", ["name", "comment"], {
  columns: [
    { key: "name",    label: "Name",    sortable: true, filterable: true },
    { key: "comment", label: "Comment", filterable: true },
  ],
}),
```

Стало (достаточно):
```js
metalake_list: catalog("Metalake", "Metalakes", ["name", "comment"]),
```

Результирующий `slots.body.type: "dataGrid"` с авто-выведенными columns — pattern apply.

### Tests

- 1218 core tests (+21: 21 для нового stable pattern: trigger.match 7 + structure.apply 6 + helpers 7 + нехватка +id/curated-count fix)
- 410 renderer
- 45 adapter-antd
- 33 stable patterns loaded (+1 — catalog-default-datagrid)
- curated bank reduced to 6 (catalog-default-datagrid promoted)
