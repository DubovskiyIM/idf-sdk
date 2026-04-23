---
"@intent-driven/core": minor
---

Authored `projection.bodyOverride` в catalog-архетипе — полная замена derived body-node.

**Use-case:** Gravitino catalog_list хочет DataGrid primitive с явными columns (sort/filter per column) вместо default card-list. До этого fix'а — crystallize игнорировал authored `body` в projection и всегда строил card-list через `buildCatalogBody`.

**Shape:**
```js
PROJECTIONS.catalog_list = {
  kind: "catalog",
  mainEntity: "Catalog",
  entities: ["Catalog"],
  bodyOverride: {
    type: "dataGrid",
    items: [],   // runtime-filled renderer'ом из world
    columns: [
      { key: "name",     label: "Name",     sortable: true, filterable: true },
      { key: "type",     label: "Type",     filter: "enum", values: [...] },
      { key: "provider", label: "Provider", sortable: true },
    ],
    onItemClick: { action: "navigate", to: "catalog_detail", params: { catalogId: "item.id" } },
  },
};
```

**Поведение:**
- `projection.bodyOverride` (object) → `slots.body = projection.bodyOverride` без модификаций
- Strategy post-processing (shape / itemLayout / emphasisFields / aggregateHeader / extraSlots / cardSpec) — **skipped** для authored bodyOverride. Автор декларирует rendering explicitly, SDK не полирует.
- `slots.body.item.intents = itemIntents` — также skipped (авторский body сам декларирует interactions через `onItemClick` и т.п.)
- Без `bodyOverride` — old behavior: `buildCatalogBody(projection, ONTOLOGY)` + все strategy-mutations.

**Parallel к projection.subCollections** (backlog §16 author curation) — authored curation поверх derivation: автор знает что декларирует, SDK respects.

**Tests:** +3 unit в `assignToSlotsCatalog.test.js`. 1190/1190 core pass.

**Closes:** Gravitino G20/G21/G38 (chip columns + Type/Provider filter + column filters) через host-level authoring catalog_list.bodyOverride.
