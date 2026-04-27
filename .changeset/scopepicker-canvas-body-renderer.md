---
"@intent-driven/renderer": minor
---

fix(renderer): §13e — `scopePicker` primitive + `body.type: "canvas"` dispatch в ArchetypeDetail

Notion field-test (2026-04-27) обнажил два renderer gap'а после §13b/§13c:

1. **«Unknown type: scopePicker»** — pattern `global-scope-picker.apply` push'ит `{ type: "scopePicker", ... }` в `slots.header` (PR #392), но primitive не зарегистрирован в renderer'е. SlotRenderer печатал error.

2. **«Unknown type: canvas»** — `assignToSlotsDetail` нормализует author `slots.body: { kind: "canvas", canvasId }` → `{ type: "canvas", canvasId }` (PR #394), но `ArchetypeDetail` рендерит body через `<SlotRenderer>` который не знает canvas-type. SlotRenderer печатал error.

## Fix 1 — `scopePicker` primitive

Новый `packages/renderer/src/primitives/ScopePicker.jsx` — minimal default-impl:

- Читает `node.entity` / `node.label` из spec
- Резолвит current scope row через `ctx.routeParams[<entity>Id]` или `ctx.viewState.active<Entity>Id`
- Рендерит badge-style label `{label}: {scopeName | "—"}`
- Адаптеры могут переопределить через `getAdaptedComponent("primitive", "scopePicker")` (когда понадобится drop-down с переключением)

Зарегистрирован в `PRIMITIVES.scopePicker` + named export.

## Fix 2 — canvas body dispatch в ArchetypeDetail

`ArchetypeDetail.jsx` теперь проверяет `slots.body?.type === "canvas"` и рендерит через `<ArchetypeCanvas>` (lookup в `CANVAS_REGISTRY` по `canvasId`). Иначе — обычный `<SlotRenderer>` (backwards-compat).

## Тесты

renderer suite: **590/590 passing** (без regression).

## Что после релиза

Notion `page_detail`:
- `slots.header` рендерит `scopePicker` badge с workspace name
- `slots.body` ({ type: "canvas", canvasId: "block_canvas" }) → `BlockCanvas` компонент с Tiptap-editor вместо «Unknown type: canvas»

## Backwards-compatibility

- `body.type !== "canvas"` идёт через старый SlotRenderer path (no behavior change)
- Адаптеры без `primitive.scopePicker` registration используют fallback ScopePicker (badge-style)
- Existing canvas archetype проекций (notion `block_canvas`, `calendar_view`, etc.) не затронуты — это новый dispatch в **detail** archetype для author body passthrough
