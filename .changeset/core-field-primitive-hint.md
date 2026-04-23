---
"@intent-driven/core": minor
---

Declarative `field.primitive` hint на уровне ontology — перекрывает role/type-based detail-body inference для custom primitives.

**Use-case:** Gravitino `Table.columns` (type: "json") рендерился как infoSection entry с bind'ом на raw JSON blob. После fix'а автор декларирует:

```js
Table: {
  fields: {
    name: { type: "string", role: "primary-title" },
    columns: { type: "json", primitive: "schemaEditor" },  // ← hint
  },
}
```

→ `detail.slots.body` получает standalone atom `{ type: "schemaEditor", bind: "columns", label: "columns" }` после обычных role-based секций. Renderer PRIMITIVES map resolves "schemaEditor" → рендер через SchemaEditor primitive (или через adapter, если capability registered).

**Generic механизм:** работает для любого primitive из PRIMITIVES — `schemaEditor`, `map`, `chart`, `treeNav`, `breadcrumbs`, etc. Field-level override вместо projection-level — cleaner authoring.

**Scope:**
- Fields с `primitive` hint pull'ятся из role-based grouping, emit'ятся как standalone atoms после основных секций detail-body.
- `label` прокидывается в primitive props (использующие primitives — оставляют, не использующие — игнорируют).
- Backward compat: fields без hint идут обычным путём (role/type heuristic).

**Tests:** +3 unit в `assignToSlotsDetail.test.js` — schemaEditor override, back-compat без hint, arbitrary primitive name (map). 1187/1187 core pass.

**Related:** Gravitino dogfood-спринт Stage 3 Task 3 (host-integration SchemaEditor для Table.columns) — после merge этого PR + bump host ontology annotate Table.columns.primitive.
