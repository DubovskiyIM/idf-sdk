---
"@intent-driven/renderer": minor
---

Новый primitive `DataGrid` — enhanced table с per-column sort / filter / visibility toggle.

**Shape:**
```js
{
  type: "dataGrid",
  items: [{ id, name, type, provider, ... }],
  columns: [
    { key: "name",     label: "Name",     sortable: true, filterable: true },
    { key: "type",     label: "Type",     filter: "enum", values: ["a","b"] },
    { key: "provider", label: "Provider", sortable: true, filterable: true, align: "right" },
  ],
  emptyLabel?: "Нет данных",
  onItemClick?: (item) => ...,  // function OR declarative nav spec
}
```

**Фичи v1:**
- **Sort**: click на sortable header toggle'ит asc→desc→none, aria-sort выставляется.
- **Filter**: text-input per filterable column (case-insensitive substring); `filter: "enum"` даёт `<select>` с `values`.
- **Column visibility**: если >3 columns — ColumnMenu dropdown с checkbox'ами для show/hide.
- **Row click**: `onItemClick` function (прямой callback) OR declarative `{action:"navigate", to, params}` с `item.fieldName` binding.
- **Cell rendering**: arrays → chip-list (first 3 + `+N`), objects → code-snippet, `format: "badge"` → pill.
- **Adapter delegation**: `ctx.adapter.getComponent("primitive", "dataGrid")` — AntD native Table и др.

**Не в scope v1 (future):**
- Column resize drag (требует AntD X-Table)
- Column pinning (AntD feature, adapter-delegation задача)
- Virtualization 1000+ rows (rc-virtual-list adapter-level)

**Use-case:** Gravitino catalog_list нуждается в Tags/Policies columns + Type/Provider filters (G20/G21/G38). DataGrid даёт все три сразу.

**Tests:** +16 unit (rendering, empty, chip-list, sorting asc/desc/none, filtering text/enum, column visibility toggle, row click function/declarative, adapter-delegation). 336/336 renderer pass.
