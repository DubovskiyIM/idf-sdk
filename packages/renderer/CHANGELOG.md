# Changelog

## 0.6.0

### Minor Changes

- 2a0bc87: Multi-archetype views (Scope B): одна projection → N archetype-рендерингов + runtime switcher.

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

## 0.5.0

### Minor Changes

- 4142c3d: Pattern Bank: первая волна `structure.apply` + `explainMatch` + first-class witnesses.

  **@intent-driven/core** (minor):

  - Новая точка `explainMatch(intents, ontology, projection, options)` — единая SDK-surface для authoring-env tooling (Studio viewer + prototype inspector). Возвращает archetype, behavioral (resolvePattern), structural (matched + nearMiss), witnesses, artifactBefore/After, previewPatternId.
  - `evaluateTriggerExplained` — per-requirement breakdown trigger'а. `evaluateTrigger` остаётся wrapper'ом.
  - `matchPatterns(intents, ontology, projection, { includeNearMiss })` — расширенная форма возвращает `{ matched, nearMiss }` с entries вида `{ pattern, explain, missing }`. Legacy shape (array) — без изменений при отсутствии options.
  - `structure.apply(slots, context)` — чистая функция в паттернах, обогащает slots при кристаллизации. Реализовано для 3 паттернов:
    - `subcollections` — добавляет sub-entity секции в detail-архетипе (FK-based auto-discovery с last-camelCase-segment fallback, pluralization y→ies / is→es / s,x,z,ch,sh+es).
    - `grid-card-layout` — выставляет `body.layout="grid"` + cardSpec из witnesses для catalog. Author-override: любой `body.layout` — no-op.
    - `footer-inline-setter` — single-replace intents перемещаются в footer как inline-setters. Author-override: существующие footer items не перетираются.
  - `applyStructuralPatterns(slots, matched, context, preferences, registry)` — встроено в crystallize pipeline (внутри шага 3). Feature-flag `ontology.features.structureApply` как kill-switch.
  - `projection.patterns: { enabled, disabled }` — author-level preference для force-apply / force-skip паттерна. Часть input'а кристаллизации, не snapshot артефакта (§16 перегенерируемость).
  - `artifact.witnesses[]` — pattern matching как first-class §15 finding c `basis: "pattern-bank"`, `reliability: "rule-based"`, `requirements: [{ kind, ok, spec }]`.
  - Helpers `findSubEntities`, `buildSection`, `sectionIdFor`, `buildCardSpec` — экспортированы для переиспользования.

  **@intent-driven/renderer** (minor):

  - `ProjectionRendererV2` prop `artifactOverride` — dev-only override (§27 authoring-env). Приоритетнее штатного `artifact`. Когда задан — используется напрямую; когда отсутствует — поведение без изменений.
  - `ProjectionRendererV2` prop `previewPatternId` — передаётся в ctx для overlay над derived-слотами.
  - Новый primitive `PatternPreviewOverlay` — dashed-border + corner-badge с pattern id. Применяется в `SlotRenderer` и `ArchetypeDetail` для слотов с `source: "derived:..."` когда `previewPatternId` активен.

  **Обратная совместимость:**

  - Все новые поля артефакта (`witnesses`, `pattern`, `body.layout`, `body.cardSpec`, `slots.sections[].source`) — additive.
  - `matchPatterns` legacy array-shape сохранён.
  - `evaluateTrigger` работает идентично.
  - `structure.apply` опциональное — паттерны без него продолжают работать только как matching-only.

## 0.4.0

### Minor Changes

- 72d1033: Координированный minor-bump всего семейства `@intent-driven/*` для согласованного версионирования публичного npm-релиза.

## 0.3.0

### Minor Changes

- 9f643b6: Расширение Dashboard-архетипа двумя новыми формами виджетов и новый primitive `EmptyState`.

  **Dashboard widgets** — теперь поддерживаются три формы:

  - `{ projection }` — embedded ProjectionRendererV2 (как раньше)
  - `{ aggregate, key, title, unit? }` — скалярный агрегат через мини-DSL: `sum(orders, total, status=completed)` / `count(orders)` / `avg(rates, value, region=eu)`. Поддерживаются операторы `=`, `!=`, `>`, `<`, `>=`, `<=`, литералы, `viewer.x`, `today`, `now`.
  - `{ inline: { entity, filter, sort } }` — встроенный мини-список без отдельной проекции.

  Чистые хелперы вынесены в `archetypes/dashboardWidgets.js` (parseAggregate / evalAggregate / matchFilter / resolveRhs / formatScalar / sortItems / toCollection) и покрыты unit-тестами.

  **EmptyState primitive** — унифицированная заглушка `{title, hint, icon, size}` для «ничего нет» / «не найдено». Заменяет inline empty-ветки в Detail / Form / Dashboard. В Detail/Form различаются два случая: «id не выбран → подсказка выбрать» vs «id есть, но не нашли → возможно удалено».

## 0.2.0 — 2026-04-15

**Map primitive + IrreversibleBadge — полевой тест 11 (delivery) + Consolidation Sprint 1.**

### Added

**§16a — Map primitive (v1.7):**

- `map` primitive — spatial primitive-категория по образцу chart. 4 layer kinds: `marker` / `route` / `polygon` / `heatmap`
- SVG-fallback встроен (`calcBounds` / `projectPoint` / `normalizeLayer` — pure functions)
- Adapter-delegation через `getAdaptedComponent("primitive","map")`
- Semantic field роли `coordinate` / `address` / `zone` в `inferFieldRole`
- Применение: 3 canvas в delivery (`order_tracker` / `dispatcher_map` / `active_delivery`)

**§23 — IrreversibleBadge primitive (v1.7):**

- `irreversibleBadge` в `PRIMITIVES` — визуальный маркер точки невозврата
- Props: `point` ("high"|"medium"), `at` (ISO timestamp), `reason` (string)
- Применение: `capture_payment` в delivery

### Changed

- `primitives/index.js` — добавлены `map` и `irreversibleBadge` в `PRIMITIVES`

---

## 0.1.0 — 2026-04-15

- Первый релиз: `ProjectionRendererV2`, `SlotRenderer`, `ErrorBoundary`
- 7 архетипов: feed / catalog / detail / form / canvas / dashboard / wizard
- 11 control-компонентов: Composer, FormModal, ConfirmDialog, IntentButton, Overflow, InlineSearch, BulkWizard, Toggle, OverlayManager, HeroCreate, capture/\*
- Primitives: atoms (12), containers (4), chart / sparkline
- Реестр адаптеров: `registerUIAdapter`, `getAdaptedComponent`, `getCapability`, `supportsVariant`
- 36 unit-тестов
