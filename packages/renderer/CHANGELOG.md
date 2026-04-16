# Changelog

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
