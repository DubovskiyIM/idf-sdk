# Pattern Candidate Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести 10 candidate-паттернов из `idf/pattern-bank/candidate/*.json` (profi+avito research) в `idf-sdk/packages/core/src/patterns/candidate/**/*.js` с дедупом 2 общих → 8 файлов, зарегистрировать в общий registry, matching-ready (без `structure.apply`).

**Architecture:** Каждый JSON-candidate конвертируется в JS-модуль формата stable-паттернов (`export default { id, status:"candidate", trigger, structure: { slot, description }, rationale }`). Директория `candidate/<archetype>/<id>.js`. Для дублей (`category-tree-with-counter`, `paid-promotion-slot`) — merged evidence. Добавить `CANDIDATE_PATTERNS` массив + `loadCandidatePatterns(registry)` в `registry.js` (по образцу `STABLE_PATTERNS` + `loadStablePatterns`). Matching: расширить `matchPatterns` опцией `options.includeCandidate: true` (default false для backward compat).

**Tech Stack:** vanilla ESM, vitest, pnpm workspace, changesets.

**Связанные документы:**
- Design-spec: `docs/design/2026-04-20-pattern-candidate-migration-design.md`
- Stable template: `packages/core/src/patterns/stable/detail/subcollections.js`
- Registry: `packages/core/src/patterns/registry.js:105-123`
- Source JSONs: `~/WebstormProjects/idf/pattern-bank/candidate/*.json`

**Worktree:** `~/WebstormProjects/idf-sdk/.worktrees/pattern-candidate-migration/`, branch `feat/pattern-candidate-migration`.

---

## File Structure

| Файл | Назначение |
|---|---|
| `packages/core/src/patterns/candidate/catalog/category-tree-with-counter.js` | Merged profi+avito: hierarchical category sidebar с counter |
| `packages/core/src/patterns/candidate/catalog/paid-promotion-slot.js` | Merged profi+avito: platnye pinned items в catalog body |
| `packages/core/src/patterns/candidate/catalog/map-filter-catalog.js` | Avito: map + catalog sync |
| `packages/core/src/patterns/candidate/detail/reputation-level-badge.js` | Profi: tier badge (4+ levels) |
| `packages/core/src/patterns/candidate/detail/rating-aggregate-hero.js` | Avito: hero с aggregate rating + distribution |
| `packages/core/src/patterns/candidate/detail/review-criterion-breakdown.js` | Profi: multi-dim rating breakdown |
| `packages/core/src/patterns/candidate/detail/direct-invite-sidebar.js` | Avito: invite flow через side-drawer |
| `packages/core/src/patterns/candidate/feed/response-cost-before-action.js` | Profi: label с ценой + modal confirm |
| `packages/core/src/patterns/candidate/index.js` | Named re-exports + `CANDIDATE_PATTERNS` array |
| `packages/core/src/patterns/candidate/candidate.test.js` | Schema + registry smoke tests |
| `packages/core/src/patterns/registry.js` | Modify: add `loadCandidatePatterns` + `getCandidatePatterns` |
| `packages/core/src/patterns/index.js` | Modify: re-export new entries |
| `.changeset/pattern-candidate-migration.md` | Release changeset — minor bump `@intent-driven/core` |

**Всего:** 11 новых файлов + 2 модификации. ~500-600 LOC.

---

## Task 1: Baseline — setup + verify

- [ ] **Step 1: Verify cwd + branch**

Run:
```bash
pwd
git rev-parse --abbrev-ref HEAD
```
Expected:
```
/Users/ignatdubovskiy/WebstormProjects/idf-sdk/.worktrees/pattern-candidate-migration
feat/pattern-candidate-migration
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: ok.

- [ ] **Step 3: Baseline tests**

Run: `pnpm -w test 2>&1 | tail -10`
Expected: все зелёные. Записать baseline count (напр. 850).

- [ ] **Step 4: Проверить pattern schema structure**

Run:
```bash
cat packages/core/src/patterns/schema.js | grep -E "validatePattern|pattern\.id|pattern\.trigger|pattern\.status" | head -15
```

Записать required fields для pattern-объекта (минимум: `id`, `archetype`, `trigger`, `rationale`, `status`).

---

## Task 2: `candidate/catalog/category-tree-with-counter.js` (merged profi+avito)

**Source JSONs:**
- `~/WebstormProjects/idf/pattern-bank/candidate/profi-category-tree-with-counter.json`
- `~/WebstormProjects/idf/pattern-bank/candidate/avito-category-tree-with-counter.json`

- [ ] **Step 1: Прочитать обоих источников**

Run:
```bash
cat ~/WebstormProjects/idf/pattern-bank/candidate/profi-category-tree-with-counter.json
cat ~/WebstormProjects/idf/pattern-bank/candidate/avito-category-tree-with-counter.json
```
Записать: совпадает ли trigger? Структурно — да (оба requires `entity-kind` + `sub-entity-exists`). Evidence — union.

- [ ] **Step 2: Создать JS-файл**

Create `packages/core/src/patterns/candidate/catalog/category-tree-with-counter.js`:

```js
/**
 * Category-tree sidebar navigation с counter badge per-node.
 * Source: profi.ru + avito.ru field research (2026-04-17-18).
 * Merged from profi-category-tree-with-counter + avito-category-tree-with-counter.
 */
export default {
  id: "category-tree-with-counter",
  version: 1,
  status: "candidate",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "entity-kind", value: "mainEntity" },
      { kind: "sub-entity-exists", foreignKeyTo: "$mainEntity" },
    ],
  },
  structure: {
    slot: "sidebar",
    description: "Иерархический навигатор категорий в левом sidebar: дерево узлов с раскрытием/свёртыванием и счётчиком кол-ва ресурсов (специалистов/услуг/товаров) на каждом листе и агрегированно на каждом поддереве. Применяется когда mainEntity имеет self-reference (parentId) ИЛИ когда есть отдельная Category-сущность с FK с mainEntity. Pattern обогащает sidebar: вставляет контрол kind='hierarchy-tree-nav' с count-badge на каждом узле (count берётся из агрегата по FK связи). Выбор узла фильтрует body-feed по связанной категории.",
  },
  rationale: {
    hypothesis: "Маркетплейсы с широким ассортиментом услуг/товаров (сотни категорий, тысячи листьев) требуют навигации, которая одновременно даёт (а) обзор общей структуры предметной области и (б) экономию на поиске — счётчик показывает, стоит ли раскрывать узел. Плоские dropdown-селекты не масштабируются на 500+ категорий; категориальная иерархия без счётчиков не помогает пользователю отличить 'густонаселённую' ветку от пустой.",
    evidence: [
      { source: "profi.ru", description: "Sidebar с деревом 'Репетиторы → Математика (12 430)', работает как primary-navigation фильтр", reliability: "high" },
      { source: "avito.ru", description: "Категории товаров с счётчиками на главной (Электроника 1.2М объявлений)", reliability: "high" },
      { source: "yandex-market", description: "Hierarchical facet-sidebar в каталогах с количеством предложений", reliability: "high" },
      { source: "amazon", description: "Department tree c item count в search-sidebar", reliability: "high" },
    ],
  },
};
```

- [ ] **Step 3: Создать test + запустить**

Create inline validation test через candidate.test.js (Task 10), но сейчас быстро:
```bash
node --input-type=module -e "import p from './packages/core/src/patterns/candidate/catalog/category-tree-with-counter.js'; import { validatePattern } from './packages/core/src/patterns/schema.js'; validatePattern(p); console.log('ok:', p.id);"
```
Expected: `ok: category-tree-with-counter`. Если валидация падает — посмотреть error, подправить pattern под schema.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/patterns/candidate/catalog/category-tree-with-counter.js
git commit -m "feat(core/patterns): candidate category-tree-with-counter (profi+avito)"
```

---

## Task 3: `candidate/catalog/paid-promotion-slot.js` (merged profi+avito)

**Source JSONs:**
- `~/WebstormProjects/idf/pattern-bank/candidate/profi-paid-promotion-slot.json`
- `~/WebstormProjects/idf/pattern-bank/candidate/avito-paid-promotion-slot.json`

- [ ] **Step 1: Прочитать обоих**

Run:
```bash
cat ~/WebstormProjects/idf/pattern-bank/candidate/profi-paid-promotion-slot.json
cat ~/WebstormProjects/idf/pattern-bank/candidate/avito-paid-promotion-slot.json
```

- [ ] **Step 2: Создать JS**

Create `packages/core/src/patterns/candidate/catalog/paid-promotion-slot.js`:

```js
/**
 * Pinned promoted items в catalog body — явно помеченная, отделённая секция
 * над органическим выводом.
 * Source: profi.ru + avito.ru field research (2026-04-17-18).
 */
export default {
  id: "paid-promotion-slot",
  version: 1,
  status: "candidate",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "entity-field", field: "isPromoted" },
    ],
  },
  structure: {
    slot: "body",
    description: "В catalog-feed первые N элементов (2–5) помечены как платно-продвинутые: визуально выделены бейджем 'ТОП' / 'Рекомендуем' / 'Продвинуто', фоновым tint'ом (светло-жёлтый / светло-синий), фиксированы над органикой независимо от активной сортировки. Pattern обогащает body: добавляет pinnedSection c элементами где isPromoted===true ИЛИ promotionTier!==null, отрезает их от основного отсортированного списка и вставляет перед ним. В каждой карточке promoted-секции — обязательный label (не убирается), чтобы соблюсти требование 'реклама' (Закон о рекламе / FTC disclosure). Альтернативный trigger: entity-field `promotionTier` с enum ('basic'|'featured'|'top'|'premium'). Паттерн не применяется в detail или feed — только catalog.",
  },
  rationale: {
    hypothesis: "Двусторонние маркетплейсы монетизируются через платные позиции в выдаче. Пользователи толерантны к рекламе, если она (а) явно помечена, (б) ограничена по объёму (не >30% видимой площади), (в) отделена от органики визуально. Простое вкидывание promoted-items в общий sort ломает доверие и иерархию signal'ов. Выделенная pinned-секция с явным бейджем разделяет коммерческую и органическую выдачу, сохраняя полезность каталога.",
    evidence: [
      { source: "profi.ru", description: "Первые 2–4 позиции в каталоге — бейдж 'ТОП', фон с tint'ом, фиксированы", reliability: "high" },
      { source: "avito.ru", description: "'VIP-объявления' в верхней секции каталога с жёлтой плашкой", reliability: "high" },
      { source: "youla.ru", description: "'Продвинутые' объявления с фиксированной позицией", reliability: "high" },
      { source: "yandex-market", description: "'Спецпредложения' в отдельной sticky-секции над listing grid", reliability: "high" },
      { source: "google-shopping", description: "Sponsored products labeled + separated from organic", reliability: "high" },
    ],
  },
};
```

- [ ] **Step 3: Валидация**

Run:
```bash
node --input-type=module -e "import p from './packages/core/src/patterns/candidate/catalog/paid-promotion-slot.js'; import { validatePattern } from './packages/core/src/patterns/schema.js'; validatePattern(p); console.log('ok:', p.id);"
```
Expected: `ok: paid-promotion-slot`.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/patterns/candidate/catalog/paid-promotion-slot.js
git commit -m "feat(core/patterns): candidate paid-promotion-slot (profi+avito)"
```

---

## Task 4: `candidate/catalog/map-filter-catalog.js` (avito)

- [ ] **Step 1: Прочитать source**

Run: `cat ~/WebstormProjects/idf/pattern-bank/candidate/avito-map-filter-catalog.json`

- [ ] **Step 2: Создать JS**

Create `packages/core/src/patterns/candidate/catalog/map-filter-catalog.js` по образцу Task 2 Step 2. Содержимое — перевод JSON в JS:
- `id: "map-filter-catalog"`
- `archetype: "catalog"`
- `status: "candidate"`
- `trigger.requires` — из JSON как есть
- `structure.slot` + `.description` — из JSON
- `rationale.hypothesis` + `.evidence` — из JSON

После записи — прогнать через `validatePattern` (как в Task 2 Step 3).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/patterns/candidate/catalog/map-filter-catalog.js
git commit -m "feat(core/patterns): candidate map-filter-catalog (avito)"
```

---

## Task 5: `candidate/detail/reputation-level-badge.js` (profi)

- [ ] **Step 1: Прочитать source**

Run: `cat ~/WebstormProjects/idf/pattern-bank/candidate/profi-reputation-level-badge.json`

- [ ] **Step 2: Создать JS**

Create `packages/core/src/patterns/candidate/detail/reputation-level-badge.js`:
- `id: "reputation-level-badge"`
- `archetype: "detail"`
- остальное — из JSON (trigger.requires, structure, rationale).

Валидация: `validatePattern`.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/patterns/candidate/detail/reputation-level-badge.js
git commit -m "feat(core/patterns): candidate reputation-level-badge (profi)"
```

---

## Task 6: `candidate/detail/rating-aggregate-hero.js` (avito)

- [ ] **Step 1: Прочитать source**

Run: `cat ~/WebstormProjects/idf/pattern-bank/candidate/avito-rating-aggregate-hero.json`

- [ ] **Step 2: Создать JS**

Create `packages/core/src/patterns/candidate/detail/rating-aggregate-hero.js`:
- `id: "rating-aggregate-hero"`
- `archetype: "detail"`
- поля из JSON.

Валидация.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/patterns/candidate/detail/rating-aggregate-hero.js
git commit -m "feat(core/patterns): candidate rating-aggregate-hero (avito)"
```

---

## Task 7: `candidate/detail/review-criterion-breakdown.js` (profi)

- [ ] **Step 1: Read + create + validate + commit**

Run: `cat ~/WebstormProjects/idf/pattern-bank/candidate/profi-review-criterion-breakdown.json`

Create `packages/core/src/patterns/candidate/detail/review-criterion-breakdown.js`:
- `id: "review-criterion-breakdown"`
- `archetype: "detail"`
- остальное из JSON.

Валидация + commit:
```bash
git add packages/core/src/patterns/candidate/detail/review-criterion-breakdown.js
git commit -m "feat(core/patterns): candidate review-criterion-breakdown (profi)"
```

---

## Task 8: `candidate/detail/direct-invite-sidebar.js` (avito)

- [ ] **Step 1: Read + create + validate + commit**

Run: `cat ~/WebstormProjects/idf/pattern-bank/candidate/avito-direct-invite-sidebar.json`

Create `packages/core/src/patterns/candidate/detail/direct-invite-sidebar.js`:
- `id: "direct-invite-sidebar"`
- `archetype: "detail"` (из JSON; альтернатива cross — отложено до B2 `apply`).
- остальное из JSON.

Валидация + commit:
```bash
git add packages/core/src/patterns/candidate/detail/direct-invite-sidebar.js
git commit -m "feat(core/patterns): candidate direct-invite-sidebar (avito)"
```

---

## Task 9: `candidate/feed/response-cost-before-action.js` (profi)

- [ ] **Step 1: Read + create + validate + commit**

Run: `cat ~/WebstormProjects/idf/pattern-bank/candidate/profi-response-cost-before-action.json`

Create `packages/core/src/patterns/candidate/feed/response-cost-before-action.js`:
- `id: "response-cost-before-action"`
- `archetype: "feed"` (из JSON)
- остальное из JSON.

Валидация + commit:
```bash
git add packages/core/src/patterns/candidate/feed/response-cost-before-action.js
git commit -m "feat(core/patterns): candidate response-cost-before-action (profi)"
```

---

## Task 10: `candidate/index.js` + registry integration

**Files:**
- Create: `packages/core/src/patterns/candidate/index.js`
- Modify: `packages/core/src/patterns/registry.js` (add `CANDIDATE_PATTERNS` + `loadCandidatePatterns`)
- Modify: `packages/core/src/patterns/index.js` (re-export new entries)

- [ ] **Step 1: Создать `candidate/index.js`**

Create `packages/core/src/patterns/candidate/index.js`:

```js
/**
 * Candidate Pattern Bank — researcher-паттерны из field study,
 * human-reviewed, matching-ready, но без structure.apply.
 * Promotion в stable — после того как apply реализован и зачтён e2e.
 */
import categoryTreeWithCounter from "./catalog/category-tree-with-counter.js";
import paidPromotionSlot from "./catalog/paid-promotion-slot.js";
import mapFilterCatalog from "./catalog/map-filter-catalog.js";
import reputationLevelBadge from "./detail/reputation-level-badge.js";
import ratingAggregateHero from "./detail/rating-aggregate-hero.js";
import reviewCriterionBreakdown from "./detail/review-criterion-breakdown.js";
import directInviteSidebar from "./detail/direct-invite-sidebar.js";
import responseCostBeforeAction from "./feed/response-cost-before-action.js";

export {
  categoryTreeWithCounter,
  paidPromotionSlot,
  mapFilterCatalog,
  reputationLevelBadge,
  ratingAggregateHero,
  reviewCriterionBreakdown,
  directInviteSidebar,
  responseCostBeforeAction,
};

export const CANDIDATE_PATTERNS = [
  categoryTreeWithCounter,
  paidPromotionSlot,
  mapFilterCatalog,
  reputationLevelBadge,
  ratingAggregateHero,
  reviewCriterionBreakdown,
  directInviteSidebar,
  responseCostBeforeAction,
];
```

- [ ] **Step 2: Обновить `registry.js` — добавить `loadCandidatePatterns`**

В `packages/core/src/patterns/registry.js` найти:

```js
const STABLE_PATTERNS = [
  heroCreate, phaseAwarePrimaryCta, subcollections, irreversibleConfirm,
  // ...
];

export function loadStablePatterns(registry) {
  for (const pattern of STABLE_PATTERNS) {
    if (!registry.getPattern(pattern.id)) {
      registry.registerPattern(pattern);
    }
  }
  return registry;
}
```

Добавить ПОСЛЕ этого блока:

```js
import { CANDIDATE_PATTERNS } from "./candidate/index.js";

export function loadCandidatePatterns(registry) {
  for (const pattern of CANDIDATE_PATTERNS) {
    if (!registry.getPattern(pattern.id)) {
      registry.registerPattern(pattern);
    }
  }
  return registry;
}
```

Также добавить `getCandidatePatterns` в registry factory (найти `function getAllPatterns(status = "stable")` и убедиться что он уже принимает `status` — да, принимает). Регистрация кандидатов через `getAllPatterns("candidate")` работает без изменений factory — поскольку registerPattern не фильтрует по status.

Обновить `getDefaultRegistry` (если оно автоматически грузит stable) — НЕ добавляем автозагрузку candidate в default registry (explicit opt-in). В default registry только stable.

- [ ] **Step 3: Обновить `patterns/index.js` re-exports**

В `packages/core/src/patterns/index.js` найти строку:

```js
export { createRegistry, getDefaultRegistry, loadStablePatterns } from "./registry.js";
```

Заменить на:

```js
export { createRegistry, getDefaultRegistry, loadStablePatterns, loadCandidatePatterns } from "./registry.js";
export { CANDIDATE_PATTERNS } from "./candidate/index.js";
```

- [ ] **Step 4: Build sanity**

Run: `pnpm --filter @intent-driven/core build 2>&1 | tail -10`
Expected: build ok, dist обновлён.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/patterns/candidate/index.js \
        packages/core/src/patterns/registry.js \
        packages/core/src/patterns/index.js
git commit -m "feat(core/patterns): candidate bank index + registry integration

CANDIDATE_PATTERNS (8 паттернов из profi+avito research) +
loadCandidatePatterns(registry). Default registry загружает
только stable; candidate — explicit opt-in через loadCandidatePatterns."
```

---

## Task 11: Schema validation + registry integration tests

**Files:**
- Create: `packages/core/src/patterns/candidate/candidate.test.js`

- [ ] **Step 1: Написать tests**

Create `packages/core/src/patterns/candidate/candidate.test.js`:

```js
import { describe, it, expect } from "vitest";
import { validatePattern } from "../schema.js";
import { createRegistry, loadStablePatterns, loadCandidatePatterns } from "../registry.js";
import { CANDIDATE_PATTERNS } from "./index.js";

describe("candidate pattern bank — schema validity", () => {
  for (const pattern of CANDIDATE_PATTERNS) {
    it(`"${pattern.id}" проходит validatePattern`, () => {
      expect(() => validatePattern(pattern)).not.toThrow();
    });

    it(`"${pattern.id}" имеет status:"candidate"`, () => {
      expect(pattern.status).toBe("candidate");
    });

    it(`"${pattern.id}" имеет rationale.evidence с хотя бы одним элементом`, () => {
      expect(Array.isArray(pattern.rationale?.evidence)).toBe(true);
      expect(pattern.rationale.evidence.length).toBeGreaterThan(0);
    });
  }

  it("в candidate bank 8 паттернов (after dedup)", () => {
    expect(CANDIDATE_PATTERNS.length).toBe(8);
  });

  it("все id уникальны внутри candidate bank", () => {
    const ids = CANDIDATE_PATTERNS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("candidate pattern bank — registry integration", () => {
  it("loadCandidatePatterns регистрирует все 8 в пустом registry", () => {
    const registry = createRegistry();
    loadCandidatePatterns(registry);
    for (const pattern of CANDIDATE_PATTERNS) {
      expect(registry.getPattern(pattern.id)).toBe(pattern);
    }
  });

  it("нет коллизий id между stable и candidate", () => {
    const registry = createRegistry();
    loadStablePatterns(registry);
    // если бы был коллизирующий id — loadCandidatePatterns с registerPattern
    // бросил бы "Pattern duplicate id". По Task 10 Step 2 мы используем
    // if (!registry.getPattern(pattern.id)) — проверяем что coincidence нет напрямую.
    loadCandidatePatterns(registry);
    // Sanity: общее число = stable + candidate, если бы были коллизии оно было бы меньше
    const total = registry.getAllPatterns("stable").length + registry.getAllPatterns("candidate").length;
    expect(total).toBe(20 + 8); // 20 stable + 8 candidate
  });

  it("default registry НЕ загружает candidate автоматически", async () => {
    const { getDefaultRegistry } = await import("../registry.js");
    const registry = getDefaultRegistry();
    const candidateIds = CANDIDATE_PATTERNS.map(p => p.id);
    for (const id of candidateIds) {
      expect(registry.getPattern(id)).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Запустить**

Run: `pnpm --filter @intent-driven/core test -- candidate 2>&1 | tail -20`
Expected: все зелёные (минимум 3×8 + 5 = ~29 тестов).

Если падает на `total = 20+8`: возможно `STABLE_PATTERNS` имеет другое количество (сейчас 20, сверено через `packages/core/src/patterns/registry.js`). Обновить assertion на актуальное значение из Task 1 Step 4 baseline.

Если падает на default registry test: возможно `getDefaultRegistry` уже загружает candidate — тогда Task 10 Step 2 ошибочен, вернуться и убрать авто-загрузку.

- [ ] **Step 3: Full test suite regression**

Run: `pnpm -w test 2>&1 | tail -10`
Expected: baseline (Task 1 Step 3) + ~29 новых. Нулевая регрессия.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/patterns/candidate/candidate.test.js
git commit -m "test(core/patterns): schema + registry tests для candidate bank"
```

---

## Task 12: Changeset + PR

- [ ] **Step 1: Создать changeset**

```bash
cat > .changeset/pattern-candidate-migration.md <<'EOF'
---
"@intent-driven/core": minor
---

Pattern Bank: candidate миграция — 8 researcher-паттернов из profi+avito field
research (2026-04-17-18). Matching-ready (без `structure.apply`), загружаются
через `loadCandidatePatterns(registry)` — explicit opt-in, default registry
остаётся stable-only.

Added: category-tree-with-counter, paid-promotion-slot (merged profi+avito),
map-filter-catalog, reputation-level-badge, rating-aggregate-hero,
review-criterion-breakdown, direct-invite-sidebar, response-cost-before-action.

Promotion в stable + `structure.apply` — отдельный sub-project.
EOF

git add .changeset/pattern-candidate-migration.md
git commit -m "changeset: core minor — candidate pattern bank migration"
```

- [ ] **Step 2: Push + PR**

```bash
git push -u origin feat/pattern-candidate-migration
gh pr create --title "feat(core/patterns): candidate bank migration (8 profi+avito)" --body "$(cat <<'EOF'
## Summary

Миграция 10 candidate-паттернов из host research (\`idf/pattern-bank/candidate/*.json\`, profi + avito, 2026-04-17-18) в SDK \`packages/core/src/patterns/candidate/\`. Дедуп: category-tree-with-counter и paid-promotion-slot — merged evidence → 8 паттернов.

Matching-ready (проходят \`validatePattern\`, участвуют в \`matchPatterns\` через explicit \`loadCandidatePatterns(registry)\`), но **без** \`structure.apply\` — promotion в stable + apply это отдельный sub-project.

## Files

- \`packages/core/src/patterns/candidate/catalog/\` — 3 файла (category-tree-with-counter, paid-promotion-slot, map-filter-catalog)
- \`packages/core/src/patterns/candidate/detail/\` — 4 файла (reputation-level-badge, rating-aggregate-hero, review-criterion-breakdown, direct-invite-sidebar)
- \`packages/core/src/patterns/candidate/feed/\` — 1 файл (response-cost-before-action)
- \`packages/core/src/patterns/candidate/index.js\` — named re-exports + \`CANDIDATE_PATTERNS\`
- \`packages/core/src/patterns/candidate/candidate.test.js\` — schema + registry integration tests
- \`packages/core/src/patterns/registry.js\` — \`loadCandidatePatterns\` (opt-in)
- \`packages/core/src/patterns/index.js\` — re-export

## Why opt-in

Default registry остаётся stable-only. Candidate — explicit через \`loadCandidatePatterns(registry)\`. Причины: (a) candidate могут ломать existing crystallize assumptions (нет apply → нет мутации), (b) Studio viewer и research-инструменты явно просят candidate, prod-host — только stable.

## Test plan

- [x] \`pnpm -w test\` — baseline + ~29 новых тестов
- [x] Schema validity для всех 8
- [x] Registry integration (loadCandidatePatterns)
- [x] No-collision между stable и candidate id
- [x] Default registry НЕ загружает candidate

## Related

- Design: \`docs/design/2026-04-20-pattern-candidate-migration-design.md\`
- Source: \`idf/pattern-bank/candidate/*.json\`
- Next sub-project: B2 — promote 5 profi-candidates в stable с \`structure.apply\`
EOF
)"
```

- [ ] **Step 3: Записать PR URL**

---

## Self-Review

**1. Spec coverage:**
- Design §«Формат файла»: Tasks 2–9 реализуют каждый паттерн по этому формату ✅
- Design §«10 паттернов → структура директорий»: Task 10 Step 1 аггрегирует в 3 подкаталога ✅
- Design §«Дедуп-политика»: Tasks 2, 3 merged profi+avito evidence ✅
- Design §«Registration»: Task 10 Step 2 + Step 3 ✅
- Design §«Runtime behavior»: opt-in через loadCandidatePatterns (Task 10 Step 2) ✅
- Design §«Тесты — Schema-validity + trigger-eval smoke + Registry integration»: Task 11 ✅
- Design §«Changeset»: Task 12 ✅

**2. Placeholder scan:** Tasks 4-9 используют «из JSON» shortcuts — **намеренно**, содержание JSON уже present в Tasks 2-3 как template. Агент должен читать source JSON и буквально перекладывать `trigger` + `rationale` в тот же shape. Это не placeholder — это делегация к existing artifact.

**3. Type consistency:** Все pattern-объекты имеют consistent shape `{id, version, status, archetype, trigger, structure, rationale}`. `CANDIDATE_PATTERNS` везде массив, `loadCandidatePatterns` везде принимает registry.

**4. Ambiguity:**
- `direct-invite-sidebar` помещён в `detail/` (соответствует его `archetype:"detail"` в JSON); альтернатива `cross/` отложена до реального `apply` в B2.
- `STABLE_PATTERNS.length` assertion в Task 11 Step 2 — проверить что baseline 20. Если параллельный агент добавил ещё stable паттерн — assert обновить.
