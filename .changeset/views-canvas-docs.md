---
"@intent-driven/core": minor
---

feat(views): §12.11 — `canvas` archetype в `projection.views[]` whitelist + docs

Закрывает SDK backlog §12.11 (Notion field-test multi-view database). Канонический кейс — Notion-style database с view-переключателем (table / board / gallery / calendar / timeline) на одной выборке.

## Что меняется

### `packages/core/src/crystallize_v2/mergeViews.js`

`ALLOWED_VIEW_ARCHETYPES`: добавлен `canvas` (раньше `catalog`/`feed`/`dashboard`). Notion calendar / timeline / Gantt views теперь декларативно работают.

### `packages/core/src/crystallize_v2/index.js`

Canvas-view даёт `slots.body = { type: "canvas", canvasId: view.canvasId || view.id }` (slot-assembly skip — host регистрирует компонент через `registerCanvas`).

### Документация

`docs/projection-views.md` — полный спек multi-view API:
- inheritance rules (scalar/array replace, objects shallow-merge, Q-level keys blocked)
- allowed view archetypes (catalog/feed/dashboard/canvas)
- Notion-style mapping table
- per-view sort/groupBy
- threshold ≥2 views для expansion
- когда не использовать views (use separate projections)

## Тесты

+4 unit:
- `mergeViews.test.js`: canvas в whitelist + warning сообщение упоминает canvas
- `viewsIntegration.test.js`: canvas-view даёт `slots.body.type = canvas` с `canvasId` + fallback на `view.id`

Полный core: **1844/1844 passing** (было 1840/1840).

## Backward-compat

Существующие projections без canvas-views работают без изменений. Wizard / detail / form в view — все ещё warning + fallback на parent.kind (это интенционально: они меняют семантику, не визуализацию).

## Следствия для host'а

Если проект объявил canvas-view, нужно зарегистрировать компонент:

```js
import { registerCanvas } from "@intent-driven/renderer";
registerCanvas("calendar_view", CalendarCanvas);
```

Canvas-компонент получает стандартные props `world` / `exec` / `viewer` / `ctx` через ArchetypeCanvas.
