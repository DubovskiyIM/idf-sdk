---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

Multi-archetype views (Scope B): одна projection → N archetype-рендерингов + runtime switcher.

**New projection API:**

```js
projection: {
  kind: "catalog", mainEntity: "Task", witnesses: [...],
  views: [
    { id: "board", name: "Доска", kind: "catalog", layout: "grid" },
    { id: "table", name: "Таблица", kind: "catalog", layout: "table" },
    { id: "stats", name: "Сводка", kind: "dashboard", widgets: [...] },
  ],
  defaultView: "board",
}
```

**Artifact new fields:**
- `views: Array<{id, name, archetype, layout, slots, matchedPatterns, witnesses}> | null`
- `defaultView: string | null`
- `viewSwitcher: { views: [{id, name, archetype}], activeId } | null`

Backward-compat: projection без `views` — artifact.views = null. Existing rendering не затрагивается.

**Inheritance rules:** view наследует parent projection; overrides — только render-level (`kind`, `layout`, `widgets`, `onItemClick`, `sort`, `patterns`, `strategy`, `name`). Q/W-level (`filter`, `witnesses`, `mainEntity`, `entities`, `idParam`) — запрещены (warning в console + ignored). Archetype whitelist: `catalog`/`feed`/`dashboard` (остальные → fallback + warning).

**Per-view Pattern Bank.** Каждая view — независимый matching + apply pass. Разные archetype → разные matched patterns (`subcollections` не сматчит dashboard-view).

**Renderer:** `ProjectionRendererV2` принимает prop `activeView`; подменяет slots/archetype на view's artifact. `ViewSwitcher` primitive — segmented-control для 2-3 views, dropdown для 4+. Экспорт через `import { ViewSwitcher } from "@intent-driven/renderer"`.

**Materializations (§17):** agent/document/voice используют **default view** only — view это UI-концепт, не data-concept.

**Philosophy alignment:** §5 composition (views = render-only, Q/W неизменны), §17 пять слоёв (materializations на default), §16 pattern bank (per-view matching).

**Out of scope:** cross-projection switcher (via `projection.group`), per-user default view (localStorage), `canvas`/`detail`/`form`/`wizard` как view archetypes.
