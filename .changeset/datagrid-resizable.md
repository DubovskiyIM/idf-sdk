---
"@intent-driven/renderer": minor
---

DataGrid: resizable columns. Per-column `resizable: true` → drag-handle справа от th-cell; mouseDown/move/up меняют width в local state. Опционально `node.persistKey` → state persist в localStorage.

Backward-compat: default `resizable: false` — UI не меняется без явного flag.
