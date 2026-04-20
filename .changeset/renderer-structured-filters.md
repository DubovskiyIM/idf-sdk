---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

Structured-filter: рендерер понимает формы из R3b / R7b / R10 / R11 v2

Закрывает backlog 1.X / 1.Y: `projection.filter` от новых R-правил теперь
интерпретируется в UI, а не игнорируется.

**core**

- Новый shared helper `evalFilter(filter, row, { viewer, world })` —
  единая surface для четырёх форматов, которые эмитят R-правила:
  - `string` — legacy JS-выражение (back-compat для messenger buildBody и
    authored viewState-фильтров);
  - `{ field, op, value }` — простой predicate (R3b singleton, R11 v2 feed),
    `value: "me.id"` резолвится через `viewer.id`;
  - `{ kind: "disjunction", fields, op, value }` — OR across полей
    (R7b multi-ownerField);
  - `{ kind: "m2m-via", via, viewerField, joinField, localField,
       statusField?, statusAllowed? }` — bridge-lookup (R10 role.scope).
- `documentMaterializer` и `voiceMaterializer` мигрированы на этот helper —
  теперь тоже корректно фильтруют structured-filter'ы (до этого упали бы
  в permissive fallback).
- `assignToSlotsFeed::buildBody` обобщён: `mainEntity === "Message"` →
  прежний messenger chat template; любой другой `mainEntity` → generic
  `buildCatalogBody`, который прокидывает `projection.filter`/`sort`
  декларативно. Закрывает path для R11 v2 `my_*_feed`.

**renderer**

- `List` primitive (`primitives/containers.jsx`) различает object-filter
  и string-filter. Object → `evalFilter` (structured), string →
  `evalCondition` (legacy с viewState/query). R9 compositions применяются
  как раньше, до фильтра.
- `ArchetypeDetail` поддерживает `projection.singleton: true` — target
  резолвится через `projection.filter` (без `idParam`), EmptyState адаптирован
  под «запись ещё не создана». Резолвер вынесен в `resolveDetailTarget`
  для unit-тестов.

Новые тесты: `filterExpr.test.js` (19), `buildGenericFeed.test.js` (6),
`listFilter.test.jsx` (6), `resolveDetailTarget.test.js` (8).
