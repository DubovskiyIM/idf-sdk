---
"@intent-driven/renderer": minor
---

DataGrid — interactivity для cell kinds `chipList` + `ownerAvatar`:

- `chipList`: рендерит «+» add-button когда `col.intentOnAssociate` задан. Click → `ctx.openOverlay(overlay_<intent>)` если overlay найден, иначе `ctx.exec(intent, {id, entity})`.
- `ownerAvatar`: avatar или placeholder становится clickable когда `col.editIntent` задан. Click → overlay/exec по той же схеме.

Foundation для Phase 3.5 (gravitino MetalakesHub canvas → SDK-rendered catalog projection).

Backward-compatible: без `intentOnAssociate`/`editIntent` cells остаются read-only как раньше.
