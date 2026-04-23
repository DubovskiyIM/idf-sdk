---
"@intent-driven/renderer": minor
---

Рендер chip-ассоциаций (`inline-chip-association` pattern) в list/grid/kanban layouts (PR #231):

- Новый primitive `RowAssociationChips` — shared между DataGrid cell-renderer'ом и containers. Layouts `inline` (для таблицы) и `stacked` (label + chips под ним для card/list).
- `containers.jsx` оборачивает каждый item (list / grid-card / kanban card) в `RowAssociationsGroup` — блок со stacked chips per `ctx.rowAssociations`. Пусто без ассоциаций — ничего не рендерится.
- `DataGrid.ChipCell` теперь делегирует в `RowAssociationChips`; header-label берётся через `pluralizeAsLabel`.

`+` кнопка дергает attachIntent, «×» на chip — detachIntent (attach-picker modal — follow-up).
