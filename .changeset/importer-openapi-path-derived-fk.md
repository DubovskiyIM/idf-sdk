---
"@intent-driven/importer-openapi": minor
---

Синтезировать path-derived foreign keys из nested OpenAPI путей.

До этого patch'а importer видел только компоненты схем — для path-based REST API (Gravitino, K8s, AWS, GitHub, Stripe) иерархия ресурсов живёт в URL (`/metalakes/{m}/catalogs/{c}/schemas`), а не в FK-полях. В итоге после import'а nested entities были flat — pattern `hierarchy-tree-nav` и R8 hub-absorption не срабатывали, tree-nav пустой.

**Что делает fix:** проходит по всем paths, вычленяет collection → path-param цепочки, и для каждого nested-endpoint'а добавляет на child-entity синтетический FK-поле `<parent>Id` (PascalSingular camelCase):

```js
// /metalakes/{m}/catalogs/{c}/schemas — immediate parent Catalog
entities.Schema.fields.catalogId = {
  type: "string",
  kind: "foreignKey",
  references: "Catalog",
  synthetic: "openapi-path",
};
```

Immediate-parent-only (не transitive) — соответствует SQL-конвенции, иначе дубликаты FK на каждый уровень. Идемпотентен: не перезаписывает поля, уже объявленные автором/enricher'ом.

**Обнаружено:** Gravitino dogfood-спринт 2026-04-22..23. Gravitino = 218 entities, но `findChildEntities("Metalake")` в pattern'е возвращал 0 потому что `metalakeId` field не существовал ни у одной сущности. После fix'а — Catalog/Schema/Table/Fileset/Topic/Model получают correct immediate-parent FK (см. `idf/docs/gravitino-ux-patterns-notes.md` P-1).

**Новые exports:** `extractCollectionChain(path)`, `extractParentChain(path)`, `synthesizeFkField(entity, parent)` — для внешнего использования (enricher post-processing, custom importer pipelines).

**Tests:** +18 unit (extractCollectionChain + extractParentChain + synthesizeFkField) + 4 integration (importOpenApi с nested paths) = 60/60 pass.

**Backward compat:** flat paths (`/tasks`) не затронуты — FK не добавляются если nesting отсутствует. Existing fields никогда не перезаписываются.
