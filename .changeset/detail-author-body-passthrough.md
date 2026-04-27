---
"@intent-driven/core": minor
---

feat(crystallize): §13c — author `slots.body` passthrough в detail-архетипе

Notion field-test (2026-04-27) выявил gap: автор объявляет `slots.body: { kind: "canvas", canvasId: "block_canvas" }` для page_detail, но `assignToSlotsDetail` игнорировал hint и derivил infoSection-column. В результате canvas-компонент (BlockEditor primitive через registerCanvas) вообще не рендерился — host видел auto-derived characteristics-секцию вместо своего content area.

## Что меняется

`assignToSlotsDetail` теперь читает `projection.slots?.body` и нормализует его в финальный slot-node до auto-derive:

| Author shape | Output |
|---|---|
| `{ kind: "canvas", canvasId }` | `{ type: "canvas", canvasId }` |
| `{ kind: "canvas" }` (без canvasId) | `{ type: "canvas", canvasId: null }` (host-fallback) |
| `{ kind: "blockEditor", entity, parentField, ... }` | `{ type: "blockEditor", ... }` |
| `{ kind: "dashboard", widgets }` | `{ type: "dashboard", widgets }` |
| `{ type: "...", ... }` (already-typed) | passthrough as-is |
| отсутствует / unknown kind | fallback на `buildDetailBody` auto-derive |

## Backwards-compatibility

- Existing detail-проекции без `slots.body` — без изменений (auto-derive прежний).
- Unknown kind — silently fall back на auto-derive (не throw'аем, чтобы упрощать миграцию).
- `slots.body` с типизированным `type` ключом — passthrough as-is (тестовые fixtures работают без regression).

## Тесты

7 новых в `crystallize_v2/authoredBodyPassthrough.test.js`:
- canvas с/без canvasId
- blockEditor с props
- dashboard с widgets
- already-typed passthrough
- backward-compat без authored body
- unknown kind → fallback

Полный core: **1848/1848 passing**.

## Notion-host

После релиза `core@~0.86` notion `page_detail.slots.body: { kind: "canvas", canvasId: "block_canvas" }` будет работать declarativно. `BlockCanvas` (зарегистрированный через `registerCanvas("block_canvas", ...)`) рендерится как полноценный body, а не как сжатая subCollection.
