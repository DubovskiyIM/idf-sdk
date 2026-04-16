---
"@intent-driven/renderer": minor
---

Расширение Dashboard-архетипа двумя новыми формами виджетов и новый primitive `EmptyState`.

**Dashboard widgets** — теперь поддерживаются три формы:

- `{ projection }` — embedded ProjectionRendererV2 (как раньше)
- `{ aggregate, key, title, unit? }` — скалярный агрегат через мини-DSL: `sum(orders, total, status=completed)` / `count(orders)` / `avg(rates, value, region=eu)`. Поддерживаются операторы `=`, `!=`, `>`, `<`, `>=`, `<=`, литералы, `viewer.x`, `today`, `now`.
- `{ inline: { entity, filter, sort } }` — встроенный мини-список без отдельной проекции.

Чистые хелперы вынесены в `archetypes/dashboardWidgets.js` (parseAggregate / evalAggregate / matchFilter / resolveRhs / formatScalar / sortItems / toCollection) и покрыты unit-тестами.

**EmptyState primitive** — унифицированная заглушка `{title, hint, icon, size}` для «ничего нет» / «не найдено». Заменяет inline empty-ветки в Detail / Form / Dashboard. В Detail/Form различаются два случая: «id не выбран → подсказка выбрать» vs «id есть, но не нашли → возможно удалено».
