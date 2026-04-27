# `projection.views[]` — multi-view проекции (§12.11)

Multi-archetype views позволяют одной проекции отдавать **несколько визуальных представлений** одной и той же выборки. Ось *Q* (что показываем) — общая, ось *V* (как показываем) — варьируется.

Канонический кейс: Notion-style **database** с view-переключателем (table / board / gallery / calendar / timeline).

## Минимальный пример

```js
const projections = {
  tasks_database: {
    kind: "catalog",                    // archetype родителя — fallback
    mainEntity: "Task",
    witnesses: ["title", "status", "dueDate"],
    filter: "archivedAt === null",
    views: [
      { id: "table",    name: "Таблица",   kind: "catalog", layout: "table" },
      { id: "board",    name: "Доска",     kind: "catalog", layout: "kanban", groupBy: "status" },
      { id: "gallery",  name: "Галерея",   kind: "catalog", layout: "grid" },
      { id: "calendar", name: "Календарь", kind: "canvas",  canvasId: "calendar_view" },
    ],
    defaultView: "board",
  },
};
```

После crystallize:

```js
artifact.views = [
  { id: "table",    archetype: "catalog", slots: {...}, ... },
  { id: "board",    archetype: "catalog", slots: {...}, ... },
  { id: "gallery",  archetype: "catalog", slots: {...}, ... },
  { id: "calendar", archetype: "canvas",  slots: { body: { type: "canvas", canvasId: "calendar_view" }, ... } },
];
artifact.defaultView   = "board";
artifact.viewSwitcher  = { views: [...meta], activeId: "board" };
artifact.archetype     = "catalog";    // = defaultView.archetype
artifact.slots         = artifact.views.find(v => v.id === "board").slots;
```

Renderer'у достаточно прочитать `artifact.viewSwitcher` и переключаться между `artifact.views[i].slots`.

## Inheritance rules

`mergeViewWithParent` (`packages/core/src/crystallize_v2/mergeViews.js`):

| Тип ключа | Поведение |
|---|---|
| **scalar / array** (`layout`, `sort`, `widgets`, `groupBy`, `canvasId`) | view replace parent |
| **object** (`patterns`, `strategy`) | shallow merge — view keys поверх parent |
| **отсутствует в view** | inherit from parent |

### Q-level keys запрещены в view

Эти ключи **нельзя** переопределить во view (warning + ignore) — они меняют выборку и должны быть в parent или в отдельной projection:

- `mainEntity`
- `entities`
- `filter`
- `witnesses`
- `idParam`

Если вам нужно показать **другой набор данных** — это новая проекция, не view.

### Allowed view archetypes

| Archetype | Поведение |
|---|---|
| `catalog` | auto-derived через slot-assembly. Нативные `layout`-варианты: `table`, `grid`, `kanban` (через `groupBy`). |
| `feed`    | auto-derived (chronological list). |
| `dashboard` | spec через `widgets: []`, slot-assembly skip. |
| `canvas` (§12.11, 2026-04-27) | **host-managed**. Slot-assembly skip; `slots.body = { type: "canvas", canvasId }`. Host регистрирует кастомный компонент через `registerCanvas(canvasId, Component)`. Используется для calendar / timeline / gantt / map view'ов. |

Любой другой archetype в view → warning + fallback на `parent.kind`. Чтобы использовать `detail` / `form` / `wizard` — это отдельные проекции, не views.

## Шаблоны Notion-style views

| Notion view | IDF mapping |
|---|---|
| Table     | `kind: "catalog", layout: "table"` |
| Board     | `kind: "catalog", layout: "kanban", groupBy: "<phase-field>"` |
| Gallery   | `kind: "catalog", layout: "grid"` |
| Calendar  | `kind: "canvas", canvasId: "<view-id>"` + host `registerCanvas` |
| Timeline  | `kind: "canvas", canvasId: "<view-id>"` (или catalog с `shape: "timeline"` если sufficient) |

### Host-side canvas регистрация

```jsx
// host bootstrap (e.g. src/standalone.jsx)
import { registerCanvas } from "@intent-driven/renderer";
import CalendarCanvas from "./domains/notion/canvas/CalendarCanvas.jsx";

registerCanvas("calendar_view", CalendarCanvas);
```

Canvas-компонент получает `world` / `exec` / `viewer` / `ctx` (см. `ArchetypeCanvas` в renderer).

## Per-view sort / groupBy

Эти ключи — render-level и наследуются обычным правилом «view replaces parent»:

```js
views: [
  { id: "by-priority", kind: "catalog", layout: "kanban", groupBy: "priority" },
  { id: "by-status",   kind: "catalog", layout: "kanban", groupBy: "status" },
  { id: "deadline",    kind: "feed",    sort: "dueDate" },
],
```

Pattern Bank на view-level прогоняется отдельно (per-view `matchedPatterns`), так что `kanban-phase-column-board` для board view сработает независимо от parent.

## Default view

```js
{ views: [...], defaultView: "table" }
```

Если `defaultView` не задан — берётся `views[0].id`. `artifact.archetype` и `artifact.slots` зеркалируют именно default view (для backward-compat с одно-view potрeбителями).

## Threshold для views expansion

Crystallize_v2 разворачивает `views[]` **только если ≥2 view'а валидны** (после whitelist + Q-level filter). При одном валидном — fallback на однопроекционное поведение, `artifact.views = null`.

## Когда не использовать views

Используйте отдельные проекции, если:

- разная выборка (`filter` / `mainEntity` / `entities`)
- разные `witnesses` или `idParam`
- разные роли видимости (`forRoles`)

Views — это **визуальные альтернативы одной и той же выборки**, не «query-варианты».
