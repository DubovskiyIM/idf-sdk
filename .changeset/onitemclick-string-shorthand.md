---
"@intent-driven/core": minor
---

feat(crystallize): §13 — `onItemClick: "projId"` string-shorthand auto-coerce

Notion field-test (2026-04-27) выявил расхождение: автор писал shorthand `onItemClick: "page_detail"` (string), но `resolveNavigateAction` в renderer'е возвращал `null` без structured `{ action: "navigate", to, params }`. Клик на feed/catalog item молча игнорировался.

## Fix

`crystallize_v2/index.js`: при `typeof proj.onItemClick === "string"` авто-coerce'им в:

```js
{
  action: "navigate",
  to: "<projId>",
  params: { [targetProj.idParam || "id"]: "item.id" },
}
```

`idParam` берётся из target-проекции (если найдена в `allProjections`), иначе fallback на `"id"`. Параметр-template `"item.id"` резолвится `resolveNavigateAction`'ом против row.

## Behaviour matrix

| Input | Output |
|---|---|
| `"page_detail"` (target.idParam=`"pageId"`) | `{ action: "navigate", to: "page_detail", params: { pageId: "item.id" } }` |
| `"unknown_target"` (нет в map) | `{ action: "navigate", to: "unknown_target", params: { id: "item.id" } }` |
| `{ action: "navigate", to: "x", params: {...} }` | unchanged (structured action passes through) |

## Tests

3 новых в `crystallize_v2/workzillaPostBump.test.js` (string→structured / fallback id / structured backward-compat).

Полный core: **1843/1843 passing**.

## Backwards-compatibility

Existing structured-action `onItemClick` объекты — без изменений. Code-bases, которые **уже** обрабатывают string-onItemClick где-то ещё (например, custom navigation hooks), получат структурированный объект — но это семантически правильное поведение, а не shorthand-в-renderer hack.
