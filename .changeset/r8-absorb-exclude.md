---
"@intent-driven/core": minor
---

feat(crystallize): §13d — `parentProjection.absorbExclude` для R8 hub-absorption

Notion field-test (2026-04-27) выявил false-positive R8 hub-absorption: `Block.pageId` ссылается на `Page`, R8 absorb'ил `block_list` как subCollection в `page_detail`. Но `Block` — это **content** страницы (рендерится в body через canvas/BlockEditor), не дочерний CRUD-каталог. В UI это давало двойное представление: блоки в body **и** «BLOCK (12)» subсекцию.

## Fix

Author opt-out на parent projection:

```js
page_detail: {
  kind: "detail",
  mainEntity: "Page",
  slots: { body: { kind: "canvas", canvasId: "block_canvas" } },
  absorbExclude: ["Block"],  // §13d — Block уже content в body
  subCollections: [
    { projectionId: "comments_thread", entity: "Comment", foreignKey: "pageId" },
    { projectionId: "page_permissions_panel", entity: "PagePermission", foreignKey: "pageId" },
  ],
},
```

R8 пропускает entities из `absorbExclude` при формировании candidates. Если после exclude оставшихся child'ов <2 (HUB_MIN_CHILDREN) — hub не формируется (graceful fallback на flat root catalogs).

## Backwards-compatibility

- Existing R8 поведение для проекций без `absorbExclude` — без изменений
- Legacy `childCatalog.absorbed: false` (per-projection override) продолжает работать
- `absorbExclude` non-array (string / null / undefined) — silently ignored (forgiving API)

## Тесты

4 новых в `crystallize_v2/absorbHubChildren.test.js`:
- baseline без opt-out (Block/Comment/Permission absorbed)
- `absorbExclude: ["Block"]` — Block остаётся root, остальные absorbed
- `absorbExclude: ["Block","Comment"]` — только Permission, <MIN → no hub
- non-array absorbExclude игнорируется

Полный core: **1886/1886 passing** (было 1882/1882).

## Notion-host

После релиза `core@~0.91` — добавить `absorbExclude: ["Block"]` на `notion.page_detail` (отдельный host PR). Subсекция «BLOCK (12)» исчезнет, content-блоки останутся только в canvas body.
