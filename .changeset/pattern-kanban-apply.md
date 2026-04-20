---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

feat(patterns): `kanban-phase-column-board.apply` + renderer KanbanBoard.

## core

Pattern apply устанавливает `slots.body.layout = { type: "kanban", columnField, columns, source }` на основе enum-options status-поля mainEntity.

**Triggers**: entity с status-field ≥3 options + ≥1 replace-intent на `<entity>.status`.

**Author-override**: существующий `body.layout` (string `"grid"` или object) → apply skip.

```js
// Derived output:
slots.body = {
  type: "list",
  source: "orders",
  layout: {
    type: "kanban",
    columnField: "status",
    columns: [
      { id: "draft", label: "Черновик" },
      { id: "active", label: "Активные" },
      { id: "done", label: "Готово" },
    ],
    source: "derived:kanban-phase-column-board",
  },
}
```

Поддерживает два формата options: `["draft", "active", ...]` (strings) и `[{value, label}, ...]` (objects). Также `entity.statuses` legacy shape.

## renderer

`List` primitive детектит `layout.type === "kanban"` → рендерит `<KanbanBoard>` вместо обычного list/grid:
- Горизонтальный flex-контейнер с `overflow-x: auto`.
- Каждая колонка (flex-basis 260px) содержит заголовок (label + счётчик items) + список cards.
- Items группируются по `item[columnField]`; unmatched items → последняя колонка.
- Per-item `onItemClick` работает как обычно (navigate).
- `data-column` атрибуты для e2e/test selectors.

**Drag-to-replace-status** — TODO (HTML5 drag API + ctx.exec на replace-intent). Сейчас — group + click, без drag.

## Тесты

- Core: **8 тестов** (`kanban-phase-column-board.test.js`).
- Renderer: **6 тестов** (`listKanban.test.jsx`).
- **1026 core / 264 renderer** passing.

## Roadmap progress

Было 12 → **11** оставшихся stable patterns без apply.
