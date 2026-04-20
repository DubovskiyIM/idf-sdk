# Multi-owner в `filterWorld` + extraction в shared util — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть §3.2 multi-owner до конца: `filterWorld.js` должен фильтровать rows по любому из `entity.owners[]` (а не только single `entity.ownerField`); поднять inline `resolveOwnerFields` в shared util; покрыть multi-owner тестами.

**Architecture:** Extract `resolveOwnerFields` из `assignToSlotsDetail.js` в shared `ontologyHelpers.js` под именем `getOwnerFields(entity, intent?)`. Заменить call site в `assignToSlotsDetail.js` на import. Добавить use в `filterWorld.js` (единственное место, где всё ещё hardcoded `entity.ownerField`). Покрыть unit-тестами обе ветки + integration на filterWorld.

**Tech Stack:** `@intent-driven/core` (pnpm workspace, vitest, tsup). Worktree `~/WebstormProjects/idf-sdk/.worktrees/invariants-owners` на ветке `feat/invariants-ownership-domain-scoping`.

**Спецификация:** [`docs/superpowers/specs/2026-04-20-invariants-multiowner-domain-scoping-design.md`](../specs/2026-04-20-invariants-multiowner-domain-scoping-design.md) (см. State update вверху — §1.1/§1.4 уже done в main).

---

## Scope check

Одна coherent feature: multi-owner в filterWorld. Небольшой refactor (extract util), чтобы не дублировать `resolveOwnerFields`. Единственный PR.

## File structure

```
packages/core/src/
├── crystallize_v2/
│   ├── ontologyHelpers.js           [MOD] добавить export getOwnerFields
│   ├── ontologyHelpers.test.js      [MOD] новый describe для getOwnerFields
│   └── assignToSlotsDetail.js       [MOD] import getOwnerFields вместо inline
└── filterWorld.js                   [MOD] support entity.owners через getOwnerFields
└── filterWorld.test.js              [MOD] новый describe: multi-owner
```

4 файла затронуто, 1 changeset, 1 PR.

---

## Task 1 — `getOwnerFields` util в ontologyHelpers

**Files:**
- Modify: `packages/core/src/crystallize_v2/ontologyHelpers.js`
- Test: `packages/core/src/crystallize_v2/ontologyHelpers.test.js`

- [ ] **Step 1: Write failing test**

Добавить в конец `ontologyHelpers.test.js`:

```js
import { getOwnerFields } from "./ontologyHelpers.js";

describe("getOwnerFields", () => {
  it("returns [] for entity without owner declarations", () => {
    expect(getOwnerFields({})).toEqual([]);
    expect(getOwnerFields(null)).toEqual([]);
    expect(getOwnerFields(undefined)).toEqual([]);
  });

  it("returns [ownerField] for legacy single-owner", () => {
    expect(getOwnerFields({ ownerField: "clientId" })).toEqual(["clientId"]);
  });

  it("returns owners[] for multi-owner declaration", () => {
    expect(getOwnerFields({ owners: ["customerId", "executorId"] }))
      .toEqual(["customerId", "executorId"]);
  });

  it("prefers owners over ownerField when both declared", () => {
    expect(getOwnerFields({
      owners: ["customerId", "executorId"],
      ownerField: "legacyField",
    })).toEqual(["customerId", "executorId"]);
  });

  it("respects intent.permittedFor as subset filter", () => {
    const entity = { owners: ["customerId", "executorId"] };
    expect(getOwnerFields(entity, { permittedFor: "executorId" }))
      .toEqual(["executorId"]);
    expect(getOwnerFields(entity, { permittedFor: ["customerId"] }))
      .toEqual(["customerId"]);
  });

  it("falls back to full owners if permittedFor empty intersection", () => {
    const entity = { owners: ["customerId", "executorId"] };
    expect(getOwnerFields(entity, { permittedFor: "unknownField" }))
      .toEqual(["customerId", "executorId"]);
  });

  it("treats permittedFor 'owner' as no-override sentinel", () => {
    const entity = { owners: ["customerId", "executorId"] };
    expect(getOwnerFields(entity, { permittedFor: "owner" }))
      .toEqual(["customerId", "executorId"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners/packages/core
pnpm vitest run src/crystallize_v2/ontologyHelpers.test.js
```

Expected: FAIL — `getOwnerFields is not a function`.

- [ ] **Step 3: Write implementation**

Добавить в конец `ontologyHelpers.js`:

```js
/**
 * Возвращает canonical массив owner-полей для сущности.
 *
 * Приоритет:
 *   1. entity.owners: ["a", "b"] (multi-owner, backlog 3.2)
 *   2. entity.ownerField: "x" (legacy single-owner)
 *   3. [] (сущность без owner'а)
 *
 * С intent.permittedFor — сужение подмножества:
 *   - string → ["fieldName"]
 *   - ["a", "b"] → пересечение с owners
 *   - "owner" или отсутствует → все owners
 *   - Нет пересечения (e.g. "unknownField") → fallback к полным owners.
 *     Предотвращает ситуацию "автор опечатался в permittedFor, intent
 *     стал невидимым никому" — better fail loud чем silent.
 */
export function getOwnerFields(entityDef, intent = null) {
  const owners = Array.isArray(entityDef?.owners)
    ? entityDef.owners
    : entityDef?.ownerField ? [entityDef.ownerField] : [];

  if (!owners.length) return [];

  const permittedFor = intent?.permittedFor;
  if (!permittedFor || permittedFor === "owner") return owners;

  const want = Array.isArray(permittedFor) ? permittedFor : [permittedFor];
  const match = owners.filter(f => want.includes(f));
  return match.length ? match : owners;
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners/packages/core
pnpm vitest run src/crystallize_v2/ontologyHelpers.test.js
```

Expected: 7 PASS в describe("getOwnerFields"), все прежние в файле — тоже PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
git add packages/core/src/crystallize_v2/ontologyHelpers.js packages/core/src/crystallize_v2/ontologyHelpers.test.js
git commit -m "feat(core): getOwnerFields util в ontologyHelpers

Canonical resolver для entity.owners[] + entity.ownerField (legacy) +
intent.permittedFor (override). Возвращает unified массив owner-полей.

Fallback: если permittedFor не пересекается с owners (e.g. опечатка
автора) — возвращаем полный owners вместо пустого. Fail loud > silent."
```

---

## Task 2 — Replace inline `resolveOwnerFields` в assignToSlotsDetail

**Files:**
- Modify: `packages/core/src/crystallize_v2/assignToSlotsDetail.js` (строка ~284 `function resolveOwnerFields`)

- [ ] **Step 1: Убедиться что unit-тесты для assignToSlotsDetail не сломаются**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners/packages/core
pnpm vitest run src/crystallize_v2/assignToSlotsDetail.test.js 2>&1 | tail -5
```

Expected: PASS baseline. Если уже были multi-owner тесты — фиксируем counter для последующей проверки.

- [ ] **Step 2: Добавить import**

В верхней части `assignToSlotsDetail.js`, рядом с другими `./ontologyHelpers.js` import'ами:

```js
import { getOwnerFields } from "./ontologyHelpers.js";
```

(Проверить — возможно `ontologyHelpers` уже импортирован, просто добавить `getOwnerFields` в существующий import.)

- [ ] **Step 3: Удалить inline `resolveOwnerFields`**

Найти блок (около строки 284):

```js
function resolveOwnerFields(entityDef, intent) {
  const owners = Array.isArray(entityDef?.owners)
    ? entityDef.owners
    : entityDef?.ownerField ? [entityDef.ownerField] : [];
  const permittedFor = intent?.permittedFor;
  if (!owners.length) return [];
  if (!permittedFor || permittedFor === "owner") return owners;
  const want = Array.isArray(permittedFor) ? permittedFor : [permittedFor];
  const match = owners.filter(f => want.includes(f));
  return match.length ? match : owners;
}
```

Удалить целиком (вместе с docstring). Заменить call site в `ownershipConditionFor` (около строки 324):

```js
// было:
const ownerFields = resolveOwnerFields(entityDef, intent);
// стало:
const ownerFields = getOwnerFields(entityDef, intent);
```

- [ ] **Step 4: Run assignToSlotsDetail tests**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners/packages/core
pnpm vitest run src/crystallize_v2/assignToSlotsDetail.test.js 2>&1 | tail -5
```

Expected: тот же счёт passing, никаких регрессий (семантика identical — один из `resolveOwnerFields` теперь external `getOwnerFields`).

- [ ] **Step 5: Commit**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
git add packages/core/src/crystallize_v2/assignToSlotsDetail.js
git commit -m "refactor(core): assignToSlotsDetail использует getOwnerFields util

Удалена inline resolveOwnerFields — дубликатная логика. Импорт из
ontologyHelpers.getOwnerFields (identical семантика). Shared util
переиспользуется filterWorld в следующей задаче."
```

---

## Task 3 — Multi-owner тест для assignToSlotsDetail::ownershipConditionFor

**Files:**
- Modify: `packages/core/src/crystallize_v2/assignToSlotsDetail.test.js`

- [ ] **Step 1: Найти подходящий describe для ownershipConditionFor**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
grep -n "ownershipCondition\|ownerField\|owners" packages/core/src/crystallize_v2/assignToSlotsDetail.test.js | head -10
```

Expected — несколько строк, можно определить существующий describe. Если нет — добавить новый в конец файла.

- [ ] **Step 2: Добавить тесты multi-owner + permittedFor**

Добавить новый describe в конец файла `assignToSlotsDetail.test.js`:

```js
describe("ownershipConditionFor — multi-owner (§3.2)", () => {
  // Minimal ontology + intent для теста ownership-condition.
  // Важно: мы используем внешний интерфейс (assignToSlotsDetail),
  // так как ownershipConditionFor не экспортируется.
  const mkOntology = (entityCfg) => ({
    entities: { Deal: entityCfg },
    roles: {},
  });

  const mkIntent = (overrides = {}) => ({
    id: "edit_deal",
    particles: {
      effects: [{ α: "replace", target: "deal.status" }],
      entities: ["Deal"],
    },
    ...overrides,
  });

  it("legacy single ownerField → 'field === viewer.id'", () => {
    const ontology = mkOntology({ ownerField: "clientId" });
    const { toolbar } = assignToSlotsDetail({
      intents: { edit_deal: mkIntent() },
      ontology,
      mainEntity: "Deal",
    });
    const btn = toolbar.find(b => b.intentId === "edit_deal");
    expect(btn.condition).toBe("clientId === viewer.id");
  });

  it("multi-owner owners[] → OR expression обёрнут в скобки", () => {
    const ontology = mkOntology({ owners: ["customerId", "executorId"] });
    const { toolbar } = assignToSlotsDetail({
      intents: { edit_deal: mkIntent() },
      ontology,
      mainEntity: "Deal",
    });
    const btn = toolbar.find(b => b.intentId === "edit_deal");
    expect(btn.condition).toBe("(customerId === viewer.id || executorId === viewer.id)");
  });

  it("permittedFor string → только указанное поле", () => {
    const ontology = mkOntology({ owners: ["customerId", "executorId"] });
    const intent = mkIntent({ permittedFor: "executorId" });
    const { toolbar } = assignToSlotsDetail({
      intents: { edit_deal: intent },
      ontology,
      mainEntity: "Deal",
    });
    const btn = toolbar.find(b => b.intentId === "edit_deal");
    expect(btn.condition).toBe("executorId === viewer.id");
  });

  it("permittedFor array → OR пересечения", () => {
    const ontology = mkOntology({ owners: ["customerId", "executorId", "observerId"] });
    const intent = mkIntent({ permittedFor: ["customerId", "executorId"] });
    const { toolbar } = assignToSlotsDetail({
      intents: { edit_deal: intent },
      ontology,
      mainEntity: "Deal",
    });
    const btn = toolbar.find(b => b.intentId === "edit_deal");
    expect(btn.condition).toBe("(customerId === viewer.id || executorId === viewer.id)");
  });
});
```

**Note**: если сигнатура `assignToSlotsDetail(...)` в реальности отличается (может быть `assignToSlotsDetail(intents, projection, ontology)` — позиционные args), обратиться к существующему test-файлу в начале файла и адаптировать. Семантика теста важнее точной сигнатуры.

- [ ] **Step 3: Run tests**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners/packages/core
pnpm vitest run src/crystallize_v2/assignToSlotsDetail.test.js 2>&1 | tail -5
```

Expected: существующие passing + 4 новых PASS.

- [ ] **Step 4: Commit**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
git add packages/core/src/crystallize_v2/assignToSlotsDetail.test.js
git commit -m "test(core): multi-owner + permittedFor покрытие в assignToSlotsDetail

4 кейса:
- legacy single ownerField → 'field === viewer.id'
- multi-owner owners[] → '(a === viewer.id || b === viewer.id)' в скобках
- permittedFor string → single field
- permittedFor array → OR пересечения с owners[]

Закрывает gap в тест-coverage backlog 3.2 — ownershipConditionFor был
реализован но не тестировался явно."
```

---

## Task 4 — `filterWorld` support `entity.owners`

**Files:**
- Modify: `packages/core/src/filterWorld.js` (строки ~128–130)

- [ ] **Step 1: Прочитать current scope логику**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
sed -n '105,140p' packages/core/src/filterWorld.js
```

Expected — блок `// 1) Row-filter:` с `if (scope && scope.via) { ... } else if (entityDef.kind === "reference") { ... } else if (entityDef.ownerField) { ... } else { owned = rows; }`.

- [ ] **Step 2: Import getOwnerFields**

В верхней части `filterWorld.js` (рядом с другими imports из `./crystallize_v2/...`):

```js
import { getOwnerFields } from "./crystallize_v2/ontologyHelpers.js";
```

- [ ] **Step 3: Заменить single-owner check на multi-owner**

Найти блок:

```js
} else if (entityDef.ownerField) {
  owned = rows.filter(r => r[entityDef.ownerField] === viewer.id);
} else {
  owned = rows;
}
```

Заменить на:

```js
} else {
  const ownerFields = getOwnerFields(entityDef);
  if (ownerFields.length > 0) {
    owned = rows.filter(r => ownerFields.some(f => r[f] === viewer.id));
  } else {
    owned = rows;
  }
}
```

Note: `scope.via` ветка (первая) всё ещё читает `entityDef.ownerField` в строке:

```js
const localField = scope.localField || entityDef.ownerField;
```

Для scope.via — scope сам декларирует `localField` в большинстве случаев; fallback на owner используется только когда scope явно не задал. Для multi-owner в scope-mode автору лучше явно задать `scope.localField`. Менять эту ветку — scope creep. Оставляем как есть, fallback на `entityDef.ownerField` продолжает работать для legacy (single-owner + scope).

- [ ] **Step 4: Run baseline tests**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners/packages/core
pnpm vitest run src/filterWorld.test.js 2>&1 | tail -5
```

Expected: все существующие tests PASS (legacy ownerField → same behaviour via getOwnerFields).

- [ ] **Step 5: Commit**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
git add packages/core/src/filterWorld.js
git commit -m "feat(core): filterWorld поддерживает entity.owners[] multi-owner

Заменён hardcoded check entityDef.ownerField на getOwnerFields() — rows
visible если совпадает ЛЮБОЕ из owner-полей с viewer.id.

Backward compat: legacy single ownerField продолжает работать
через тот же util (возвращает массив из одного элемента).

scope.via ветка не тронута — там localField декларируется в scope,
fallback на ownerField остаётся legacy; для multi-owner в scope-mode
автор явно задаёт scope.localField."
```

---

## Task 5 — Multi-owner тесты для filterWorld

**Files:**
- Modify: `packages/core/src/filterWorld.test.js`

- [ ] **Step 1: Читать существующий тест-файл для style**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
head -60 packages/core/src/filterWorld.test.js
```

Определить как тесты импортируют filterWorldForRole + какой shape у fixture.

- [ ] **Step 2: Добавить тесты в конец файла**

```js
describe("filterWorldForRole — multi-owner (§3.2)", () => {
  const ontology = {
    entities: {
      Deal: {
        owners: ["customerId", "executorId"],
        fields: {
          id: { type: "text" },
          customerId: { type: "foreignKey", refs: "User" },
          executorId: { type: "foreignKey", refs: "User" },
          status: { type: "text" },
        },
      },
    },
    roles: {
      user: {
        visibleFields: {
          Deal: ["id", "customerId", "executorId", "status"],
        },
      },
    },
  };

  const world = {
    deals: [
      { id: "d1", customerId: "alice", executorId: "bob",  status: "open" },
      { id: "d2", customerId: "carol", executorId: "dave", status: "open" },
      { id: "d3", customerId: "alice", executorId: "dave", status: "open" },
    ],
  };

  it("customer видит свои Deal'ы (как customerId)", () => {
    const viewer = { id: "alice", role: "user" };
    const { deals } = filterWorldForRole(world, viewer, ontology);
    const ids = deals.map(d => d.id).sort();
    expect(ids).toEqual(["d1", "d3"]);
  });

  it("executor видит свои Deal'ы (как executorId)", () => {
    const viewer = { id: "dave", role: "user" };
    const { deals } = filterWorldForRole(world, viewer, ontology);
    const ids = deals.map(d => d.id).sort();
    expect(ids).toEqual(["d2", "d3"]);
  });

  it("viewer видит Deal когда совпадает ХОТЬ ОДНО owner-поле", () => {
    // bob — executor в d1 только. Должен увидеть d1.
    const viewer = { id: "bob", role: "user" };
    const { deals } = filterWorldForRole(world, viewer, ontology);
    const ids = deals.map(d => d.id).sort();
    expect(ids).toEqual(["d1"]);
  });

  it("viewer не видит Deal где не является ни одним из owners", () => {
    // eve никому не customer и не executor.
    const viewer = { id: "eve", role: "user" };
    const { deals } = filterWorldForRole(world, viewer, ontology);
    expect(deals).toEqual([]);
  });

  it("legacy ownerField продолжает работать (backward-compat)", () => {
    const legacyOntology = {
      entities: {
        Deal: {
          ownerField: "customerId",
          fields: { id: { type: "text" }, customerId: { type: "foreignKey", refs: "User" } },
        },
      },
      roles: { user: { visibleFields: { Deal: ["id", "customerId"] } } },
    };
    const viewer = { id: "alice", role: "user" };
    const { deals } = filterWorldForRole(world, viewer, legacyOntology);
    const ids = deals.map(d => d.id).sort();
    expect(ids).toEqual(["d1", "d3"]);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners/packages/core
pnpm vitest run src/filterWorld.test.js 2>&1 | tail -5
```

Expected: baseline + 5 новых PASS.

- [ ] **Step 4: Commit**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
git add packages/core/src/filterWorld.test.js
git commit -m "test(core): multi-owner покрытие в filterWorld

5 кейсов:
- customer видит свои Deal'ы через customerId
- executor видит свои через executorId
- совпадение ЛЮБОГО owner-поля открывает row (OR-семантика)
- non-owner не видит Deal
- legacy ownerField backward-compat"
```

---

## Task 6 — Changeset + финальный test run

**Files:**
- Create: `.changeset/multiowner-filterworld.md`

- [ ] **Step 1: Build SDK core**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners/packages/core
pnpm build 2>&1 | tail -5
```

Expected: ESM + CJS + DTS build success.

- [ ] **Step 2: Full test run — no regressions**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
pnpm -r test 2>&1 | grep -E "Tests" | head -10
```

Expected: core tests = baseline + ~12 новых (7 getOwnerFields + 4 multi-owner в assignToSlotsDetail + 5 в filterWorld + minus-0 из refactor).

- [ ] **Step 3: Создать changeset**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
cat > .changeset/multiowner-filterworld.md <<'EOF'
---
"@intent-driven/core": minor
---

`filterWorldForRole` поддерживает `entity.owners[]` multi-owner — row visible когда совпадает любое из owner-полей с `viewer.id`. Новый export `getOwnerFields(entity, intent?)` в `crystallize_v2/ontologyHelpers.js` унифицирует resolve: `entity.owners[]` > `entity.ownerField` (legacy) > `[]`; с `intent.permittedFor` — subset фильтр.

Backward compat: legacy single `ownerField` работает через тот же util (возвращает массив из одного). Существующие 10 доменов не требуют миграции.

`assignToSlotsDetail.js` переиспользует новый util (удалена дубликатная inline `resolveOwnerFields`).

Закрывает `docs/sdk-improvements-backlog.md` §3.2 полностью (ранее было реализовано только в `ownershipConditionFor` для detail toolbar, но не в viewer-scoping).
EOF
```

- [ ] **Step 4: Commit**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
git add .changeset/multiowner-filterworld.md
git commit -m "chore: changeset для multiowner filterWorld (minor bump)"
```

---

## Task 7 — Push + create PR

**Files:**
- No file changes.

- [ ] **Step 1: Verify commit history**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
git log origin/main..HEAD --oneline
```

Expected — 7 строк:
1. chore: changeset для multiowner filterWorld
2. test(core): multi-owner покрытие в filterWorld
3. feat(core): filterWorld поддерживает entity.owners[]
4. test(core): multi-owner + permittedFor покрытие в assignToSlotsDetail
5. refactor(core): assignToSlotsDetail использует getOwnerFields util
6. feat(core): getOwnerFields util в ontologyHelpers
7. docs(spec): invariants schema robustness + multi-owner ... (из brainstorming)

- [ ] **Step 2: Push**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
git push -u origin feat/invariants-ownership-domain-scoping 2>&1 | tail -5
```

Expected: `* [new branch]` + PR creation URL.

- [ ] **Step 3: Create PR**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/invariants-owners
gh pr create --title "feat(core): multi-owner в filterWorld + getOwnerFields util (§3.2)" --body "$(cat <<'EOF'
## Summary

Закрывает `docs/sdk-improvements-backlog.md` §3.2 multi-owner **полностью**.

**Open gap перед этим PR**: `assignToSlotsDetail::ownershipConditionFor` уже поддерживал `entity.owners[]` + `intent.permittedFor` (toolbar-conditions), но `filterWorld.js` всё ещё hardcoded single `entity.ownerField` — viewer-scoping не пропускал rows, где совпадение через second owner.

**Changes**:
- `getOwnerFields(entity, intent?)` util в `crystallize_v2/ontologyHelpers.js` — canonical resolver (owners > ownerField > []); respects `intent.permittedFor` subset; graceful fallback если permittedFor не пересекается с owners (fail loud).
- `assignToSlotsDetail.js` переиспользует util (удалена inline `resolveOwnerFields`).
- `filterWorld.js` использует util — multi-owner filter через OR на всех owner-полях.
- 16 новых тестов: 7 unit для `getOwnerFields`, 4 для `ownershipConditionFor` multi-owner (пробел в coverage), 5 для `filterWorld` multi-owner.

**Backward compat**: legacy `ownerField` работает через тот же util.

**Версия**: `@intent-driven/core` minor bump (backward-compat addition).

## State update — §1.1 и §1.4 уже реализованы

Spec первоначально предполагал что §1.1 (handler schema drift) и §1.4 (invariant.where для всех kinds) в scope. Deep check codebase'а показал: обе реализованы параллельным агентом (normalize.js + try/catch в invariants/index.js; matchesWhere во всех 4 kind-handlers).

Оставшаяся часть §3.2 multi-owner — этот PR.

## Test plan

- [x] `pnpm -r build` — success для core
- [x] `pnpm -r test` — baseline + 16 новых passing, no regressions
- [ ] Парный host PR: миграция `Deal.ownerField` → `Deal.owners: ["customerId", "executorId"]` + `submit_work_result.permittedFor: "executorId"` (отдельный workstream после публикации SDK)
EOF
)"
```

Expected: PR URL.

---

## Self-Review

**1. Spec coverage.**

Spec §3.2 (multi-owner):
- [x] `entity.owners` array support → Task 4 (filterWorld)
- [x] `entity.ownerField` backward compat → Task 4 legacy test
- [x] `intent.permittedFor` override → Task 1 + Task 3 tests
- [x] `getOwnerFields` util → Task 1
- [x] `assignToSlotsDetail` reuse util → Task 2

Spec §1.1 (schema drift) — **N/A** (already done in main).
Spec §1.4 (invariant.where) — **N/A** (already done in main).

All in-scope items covered.

**2. Placeholder scan.** Нет TBD/TODO. Все code blocks имеют конкретный код. Команды — exact paths.

**3. Type consistency.** `getOwnerFields(entity, intent?)` signature consistent во всех tasks. `entity.owners` vs `entity.ownerField` используются единообразно. `permittedFor` как string or array — explicit в тестах обеих форм.

**Zero gaps.** Готов к исполнению.
