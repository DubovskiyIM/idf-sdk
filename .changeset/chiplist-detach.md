---
"@intent-driven/renderer": minor
---

DataGrid `chipList` cell kind: per-chip «×» detach button когда `col.intentOnDetach` задан.

Click × → `ctx.exec(intentOnDetach, { id, entity, value: chipText })`. Foundation для gravitino Phase 3.10 (drop GroupDetailPane Members tab — chipList с associate + detach закрывает interactive add/remove use-case).

Backward-compatible: без `intentOnDetach` chips остаются read-only.
