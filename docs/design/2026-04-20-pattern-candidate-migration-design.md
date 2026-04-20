# Pattern Candidate Migration — design

**Дата:** 2026-04-20
**Ветка:** `feat/pattern-candidate-migration`
**Пакет:** `@intent-driven/core`
**Источник:** 10 researcher-паттернов из `idf/pattern-bank/candidate/*.json` (profi + avito field research 2026-04-17–18), не перенесённых в SDK.

## Контекст

Researcher pipeline (`scripts/pattern-researcher.mjs` в host) извлекает candidate-паттерны из реальных продуктов в `idf/pattern-bank/candidate/*.json`. Это human-review staging: перед промоцией в SDK candidate (matching-ready) или stable (с `apply`) паттерн проверяется. 10 паттернов (5 profi + 5 avito) прошли human review и готовы к миграции в SDK.

Текущее состояние: `idf-sdk/packages/core/src/patterns/candidate/` — **пустая директория**. Stable bank насчитывает 20 паттернов (detail 9, catalog 4, cross 7, feed 2). Новые 10 → 30 total (после дедупа — 28).

## Цель

1. Перенести 10 JSON-candidates в JS-формат SDK, совместимый со stable-паттернами.
2. Дедупить 2 общих паттерна (`category-tree-with-counter`, `paid-promotion-slot` — у profi и avito), объединив evidence.
3. Зарегистрировать в общем pattern registry.
4. `structure.apply` **не реализуется** на этом шаге — только matching-ready schema (trigger + rationale).

## Не в scope

- `structure.apply` для всех candidate — это **sub-project B2** (отдельный spec, после миграции).
- Удаление JSON-исходников из `idf/pattern-bank/candidate/` — остаются как source-of-truth для research pipeline.
- Promotion в `stable/` — решение по promotion после того как candidate реально применяется.

## Архитектура

### Формат файла

Совместимый со stable-паттернами (`packages/core/src/patterns/stable/detail/subcollections.js` как reference):

```js
// packages/core/src/patterns/candidate/detail/reputation-level-badge.js
export default {
  id: "reputation-level-badge",
  version: 1,
  status: "candidate",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "entity-field", field: "level", minOptions: 3 },
    ],
  },
  structure: {
    slot: "body",
    description: "В catalog-карточке ... (text from JSON).",
    // apply не реализуется в B1 — matching-only
  },
  rationale: {
    hypothesis: "Уровень доверия/репутации — многомерная конструкция...",
    evidence: [
      { source: "profi.ru", description: "...", reliability: "high" },
      { source: "stackoverflow", description: "...", reliability: "high" },
      // ...
    ],
  },
};
```

`structure.apply` отсутствует — pattern matching'уется (`matchPatterns`), но не мутирует slots.

### 10 паттернов → структура директорий

```
packages/core/src/patterns/candidate/
  catalog/
    category-tree-with-counter.js    ← profi + avito merged
    paid-promotion-slot.js            ← profi + avito merged
    map-filter-catalog.js             ← avito
  detail/
    reputation-level-badge.js         ← profi
    rating-aggregate-hero.js          ← avito
    review-criterion-breakdown.js     ← profi
    direct-invite-sidebar.js          ← avito
  feed/
    response-cost-before-action.js    ← profi
  index.js                            ← export all
```

**8 файлов после дедупа** (10 source → 2 merged).

Поместить `direct-invite-sidebar` в `detail/` (соответствует его archetype:"detail" в JSON). Альтернатива — `cross/` — отложить до реального `apply` (B2), где станет ясно cross-archetype он или detail.

### Дедуп-политика

Для `category-tree-with-counter` и `paid-promotion-slot` — JSON с profi и avito имеют **идентичный trigger** и **эквивалентный structure**, но разные evidence. Merge policy:

```js
// candidate/catalog/category-tree-with-counter.js
export default {
  id: "category-tree-with-counter",
  // ...из profi JSON trigger/structure...
  rationale: {
    hypothesis: "...из profi...",
    evidence: [
      // все evidence из profi + все evidence из avito, dedup по source
      { source: "profi.ru", ... },
      { source: "avito", ... },
      { source: "yandex-market", ... },
    ],
  },
};
```

### Registration

`packages/core/src/patterns/candidate/index.js`:
```js
// Named re-exports для всех 8 файлов
export { default as categoryTreeWithCounter } from "./catalog/category-tree-with-counter.js";
export { default as paidPromotionSlot } from "./catalog/paid-promotion-slot.js";
// ... все 8 ...

// Bundle export для общего registry
export const CANDIDATE_PATTERNS = [
  // все default exports в массиве
];
```

`packages/core/src/patterns/index.js` (существующий) — добавить импорт `CANDIDATE_PATTERNS` и включить в общий registry. Текущий registry stable-only; после миграции — оба.

### Runtime behavior

`matchPatterns(projection, intents, ontology)` — existing SDK function. После миграции:
- Matched candidate-паттерны попадают в `matched: [...]` с `status:"candidate"`.
- Без `structure.apply` — они **не мутируют** slots (pipeline остаётся no-op для них).
- `explainMatch` включает candidate в output с badge `candidate`, near-miss и witnesses работают.
- `artifact.witnesses[]` получает finding с `basis:"pattern-bank", reliability:"rule-based"` как и для stable (трекинг через Pattern Inspector).

## Тесты

### Schema-validity

`packages/core/src/patterns/candidate/__tests__/schema.test.js`:
- Импорт `CANDIDATE_PATTERNS`, каждый проходит `validatePattern(p)` (существующий validator).
- Все имеют `status: "candidate"` (defensive check).
- Нет ID-коллизий со stable-паттернами.

### Trigger-eval smoke

Каждый паттерн даёт `matchPatterns` один positive fixture (minimal ontology/projection/intents где он матчится) и один negative (где не матчится).

Минимальные fixture-proекции:
- `category-tree-with-counter`: ontology с self-referencing FK → матч.
- `reputation-level-badge`: entity с `level` enum field 4 options → матч.
- `response-cost-before-action`: intent `α:"add"` + `confirmation:"modal"` → матч.
- etc.

Файлы: `packages/core/src/patterns/candidate/<archetype>/<id>.test.js` — по одному на каждый паттерн, TDD-стиль.

### Registry integration

`packages/core/src/patterns/__tests__/registry.test.js` (расширить):
- Общий registry содержит stable + candidate.
- `matchPatterns` возвращает оба kinds.

## Файлы

**Новые:**
- `packages/core/src/patterns/candidate/catalog/*.js` (3)
- `packages/core/src/patterns/candidate/detail/*.js` (4)
- `packages/core/src/patterns/candidate/feed/*.js` (1)
- `packages/core/src/patterns/candidate/index.js` (1)
- `packages/core/src/patterns/candidate/__tests__/schema.test.js` (1)
- `packages/core/src/patterns/candidate/**/<id>.test.js` (8)

**Modify:**
- `packages/core/src/patterns/index.js` — добавить candidate в общий registry (imports + re-exports).

Примерно **14 файлов**, ~600 LOC.

## Changeset

`.changeset/*.md`:
```
---
"@intent-driven/core": minor
---

Pattern Bank: 8 candidate-паттернов из profi/avito research (2026-04-17-18).
Matching-ready (без apply). Закрывает backlog миграции researcher pipeline
в SDK. Promotion в stable + apply — отдельные sub-projects (B2/B3).
```

## Acceptance

- `pnpm -w test` — все новые тесты зелёные, existing — без регрессии.
- `pnpm -w build` — все пакеты собираются.
- В Studio viewer `/studio/patterns` (host-side testing, отдельный цикл) — candidate badges видны.
- Host `idf/pattern-bank/candidate/` — не тронут (source-of-truth остаётся).
