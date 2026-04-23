---
"@intent-driven/renderer": patch
"@intent-driven/adapter-antd": patch
---

DataGrid primitive теперь resolve'ит items из `ctx.world[node.source]` когда `node.items` пустой.

**Problem:** DataGrid ожидал `node.items` напрямую; в catalog `projection.bodyOverride` (idf-sdk#214) `items: []` пустой (items — runtime-data). Без host-level resolve'а grid получал empty array → "Нет данных" на всех catalog-list проекциях.

**Fix:** новый `resolveItems(node, ctx)` в обоих — renderer DataGrid.jsx и adapter-antd AntdDataGrid:
- `node.items` (non-empty array) → используем
- `node.items` пустой + `node.source` (string) → `ctx.world[source]`
- fallback → `[]`

**Shape extension:**
```js
projection.bodyOverride = {
  type: "dataGrid",
  source: "catalogs",   // NEW — имя коллекции в ctx.world
  columns: [...],
  onItemClick: {...},
};
```

Source convention совпадает с catalog-архетипа default `buildCatalogBody` (`list.source = "<entityLowerCase>s"`).

**Tests:** existing 16 renderer + 45 adapter-antd tests pass без изменений (backward compat: empty node.items + no source → [] as before).

**Closes:** Gravitino G20/G21/G38 (catalog list DataGrid activation end-to-end).
