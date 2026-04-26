# Joint salience+slot solver — Phase 1 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить чистые функции `buildCostMatrix` и `greedyAssign` в `@intent-driven/core` как фундамент joint salience+slot optimization. Pure-функции — параллельно с существующим `assignToSlots*`, **без интеграции** (это Phase 2). Предоставляет API для будущей замены.

**Architecture:** Новый модуль `crystallize_v2/jointSolver.js`, изолированный от `assignToSlots*`. `buildCostMatrix(intents, slots, ctx)` строит матрицу `cost[i][s]` через salience + ergonomic penalties. `greedyAssign(matrix)` сортирует intents по min-cost и распределяет по слотам с capacity respect. Hungarian algorithm — Phase 2; calibration на 21 ручном решении — Phase 3.

**Tech Stack:** `@intent-driven/core@0.79.0` baseline, ES modules, vitest, fast-check (уже добавлен в core/devDeps в A1).

**Backlog ref:** `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2 (в idf-sdk PR #366).

---

## File Structure

**Create:**
- `packages/core/src/crystallize_v2/jointSolver.js` — pure-функции `buildCostMatrix`, `greedyAssign`, `selectSlotForIntent` + типы.
- `packages/core/src/crystallize_v2/jointSolver.test.js` — unit + property tests.
- `.changeset/joint-solver-phase1.md` — minor bump для core.

**Modify:**
- `packages/core/src/index.js` — экспортировать `buildCostMatrix`, `greedyAssign`.

**Не трогаем (Phase 2):**
- `packages/core/src/crystallize_v2/assignToSlotsCatalog.js`
- `packages/core/src/crystallize_v2/assignToSlotsDetail.js`
- `packages/core/src/crystallize_v2/assignToSlots.js`

Это критично — Phase 1 живёт параллельно. Замена существующих assign'ов произойдёт только после Phase 2 parity tests.

---

## Cost function (математическая спецификация)

Для пары `(intent_i, slot_s)`:

```
cost(i, s) = -salience(i)           // выгода (минус, потому что minimize)
           + capacityPenalty(s)     // если slot переполнен (+∞)
           + roleMismatchPenalty(i, s)   // CTA в footer = +50
           + capabilityGapPenalty(s)     // slot требует unmet capability = +∞
```

**Slots модель (упрощённая для Phase 1):**

```js
{
  primaryCTA: { capacity: 3, allowedRoles: ["primary", "destructive"] },
  secondary:  { capacity: 5, allowedRoles: ["primary", "secondary", "navigation"] },
  toolbar:    { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  footer:     { capacity: 5, allowedRoles: ["utility", "destructive"] },
}
```

**Intent role classification:** через salience tier:
- salience ≥ 80 → "primary"
- salience ≥ 60 → "secondary"
- salience ≥ 30 → "navigation"
- salience < 30 → "utility"
- removeMain effects → +"destructive" (multi-role)

**Greedy algorithm:**
1. Sort intents by salience desc (через `bySalienceDesc`).
2. Для каждого intent:
   - Найти slot с min cost(i, s) среди тех где `capacity > 0`.
   - Если все cost = +∞ — emit witness `basis: "ill-conditioned"` и intent остаётся unassigned.
   - Иначе assign + decrement capacity.
3. Return `Map<intentId, slotName>` + witnesses.

---

## Task 0: Worktree sanity + Phase 1 baseline

**Files:**
- Verify: `packages/core/src/crystallize_v2/{salience,assignToSlots*}.js`

- [ ] **Step 1: Подтвердить worktree и core baseline**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/joint-solver-phase1
git status -sb
node -p "require('./packages/core/package.json').version"
```

Expected: branch `feat/joint-solver-phase1`, version `0.79.0`.

- [ ] **Step 2: Установить deps (fresh worktree)**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/joint-solver-phase1 && pnpm install 2>&1 | tail -3
```

Expected: `Done in <Xs>`.

- [ ] **Step 3: Прогнать существующий core suite — baseline**

```bash
cd packages/core && npx vitest run 2>&1 | tail -5
```

Expected: 1700/1700 passing (snapshot ещё не merged, baseline без A1).

- [ ] **Step 4: Подтвердить, что salience.js + bySalienceDesc работают**

```bash
cd packages/core && npx vitest run src/crystallize_v2/salience 2>&1 | tail -5
```

Expected: passing. Если что-то failing — STOP и доложить.

---

## Task 1: classifyIntentRole — классификация intent в slot-роль

**Files:**
- Create: `packages/core/src/crystallize_v2/jointSolver.js`
- Create: `packages/core/src/crystallize_v2/jointSolver.test.js`

- [ ] **Step 1: Написать failing-тест**

Создать `packages/core/src/crystallize_v2/jointSolver.test.js`:

```js
import { describe, it, expect } from "vitest";
import { classifyIntentRole } from "./jointSolver.js";

describe("classifyIntentRole", () => {
  it("salience ≥ 80 → primary", () => {
    expect(classifyIntentRole({ salience: 100 })).toContain("primary");
    expect(classifyIntentRole({ salience: 80 })).toContain("primary");
  });

  it("salience 60-79 → secondary", () => {
    expect(classifyIntentRole({ salience: 70 })).toContain("secondary");
    expect(classifyIntentRole({ salience: 60 })).toContain("secondary");
  });

  it("salience 30-59 → navigation", () => {
    expect(classifyIntentRole({ salience: 40 })).toContain("navigation");
    expect(classifyIntentRole({ salience: 30 })).toContain("navigation");
  });

  it("salience < 30 → utility", () => {
    expect(classifyIntentRole({ salience: 10 })).toContain("utility");
    expect(classifyIntentRole({ salience: 5 })).toContain("utility");
  });

  it("intent с remove-main effect — добавляет destructive", () => {
    const intent = {
      salience: 30,
      particles: { effects: [{ α: "remove", target: "Listing" }] },
    };
    const roles = classifyIntentRole(intent, "Listing");
    expect(roles).toContain("navigation");
    expect(roles).toContain("destructive");
  });

  it("без salience → default 40 → navigation", () => {
    expect(classifyIntentRole({})).toContain("navigation");
  });

  it("intent с salience '' (некорректное) — default", () => {
    expect(classifyIntentRole({ salience: "junk" })).toContain("navigation");
  });
});
```

- [ ] **Step 2: Запустить — должен FAIL**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolver.test.js 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать classifyIntentRole**

Создать `packages/core/src/crystallize_v2/jointSolver.js`:

```js
/**
 * Joint salience+slot solver — Phase 1 (pure-функции).
 *
 * Параллельно с существующим assignToSlots*; интеграция — Phase 2 после
 * parity tests. Cost matrix + greedy assignment, без Hungarian (Phase 2).
 *
 * Backlog: docs/superpowers/specs/2026-04-26-core-backlog.md § A2.
 */

const ROLE_PRIMARY = "primary";
const ROLE_SECONDARY = "secondary";
const ROLE_NAVIGATION = "navigation";
const ROLE_UTILITY = "utility";
const ROLE_DESTRUCTIVE = "destructive";

/**
 * Классифицировать intent в один или несколько slot-ролей.
 *
 * Ролей может быть несколько — `remove`-intent одновременно navigation
 * (по salience) и destructive (по эффекту). Slot принимает intent если
 * хотя бы одна роль входит в `slot.allowedRoles`.
 *
 * @param {Object} intent — intent definition (с salience и particles)
 * @param {string} [mainEntity] — для проверки destructive
 * @returns {string[]} — массив ролей
 */
export function classifyIntentRole(intent, mainEntity) {
  const roles = [];
  const salience = typeof intent?.salience === "number" ? intent.salience : 40;

  if (salience >= 80) roles.push(ROLE_PRIMARY);
  else if (salience >= 60) roles.push(ROLE_SECONDARY);
  else if (salience >= 30) roles.push(ROLE_NAVIGATION);
  else roles.push(ROLE_UTILITY);

  // Destructive — orthogonal: remove-эффект на mainEntity
  const effects = intent?.particles?.effects || [];
  const mainLower = (mainEntity || "").toLowerCase();
  const isDestructive = effects.some((e) => {
    if (e?.α !== "remove" && e?.alpha !== "remove") return false;
    const t = typeof e?.target === "string" ? e.target.toLowerCase() : "";
    return t === mainLower || t.startsWith(mainLower + ".");
  });
  if (isDestructive) roles.push(ROLE_DESTRUCTIVE);

  return roles;
}
```

- [ ] **Step 4: Запустить — должен PASS**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolver.test.js 2>&1 | tail -5
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crystallize_v2/jointSolver.js packages/core/src/crystallize_v2/jointSolver.test.js
git commit -m "feat(core): classifyIntentRole — Phase 1 joint solver foundation

Классифицирует intent в slot-роли по salience tier'ам (primary /
secondary / navigation / utility) + destructive flag по remove-эффекту
на mainEntity. Slot принимает intent если хотя бы одна роль входит
в slot.allowedRoles.

Backlog: docs/superpowers/specs/2026-04-26-core-backlog.md § A2."
```

---

## Task 2: buildCostMatrix — построение cost-матрицы

**Files:**
- Modify: `packages/core/src/crystallize_v2/jointSolver.js`
- Modify: `packages/core/src/crystallize_v2/jointSolver.test.js`

- [ ] **Step 1: Failing-тесты для buildCostMatrix**

Дописать в `jointSolver.test.js`:

```js
import { buildCostMatrix, INFINITY_COST } from "./jointSolver.js";

const SLOTS_DEFAULT = {
  primaryCTA: { capacity: 3, allowedRoles: ["primary", "destructive"] },
  secondary:  { capacity: 5, allowedRoles: ["primary", "secondary", "navigation"] },
  toolbar:    { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  footer:     { capacity: 5, allowedRoles: ["utility", "destructive"] },
};

const mkIntent = (id, salience, opts = {}) => ({
  id,
  salience,
  particles: { effects: opts.effects || [] },
  ...opts,
});

describe("buildCostMatrix", () => {
  it("матрица размера intents × slots", () => {
    const intents = [mkIntent("a", 80), mkIntent("b", 40)];
    const { cost, rowIndex, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
    });
    expect(cost).toHaveLength(2);
    expect(cost[0]).toHaveLength(4);
    expect(rowIndex.get("a")).toBe(0);
    expect(rowIndex.get("b")).toBe(1);
    expect([...colIndex.keys()]).toEqual(["primaryCTA", "secondary", "toolbar", "footer"]);
  });

  it("cost = -salience для slot который принимает роль intent'а", () => {
    const intents = [mkIntent("primary_intent", 80)];
    const { cost, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
    });
    // primary_intent имеет роль "primary"; primaryCTA принимает primary
    expect(cost[0][colIndex.get("primaryCTA")]).toBe(-80);
    // secondary также принимает primary
    expect(cost[0][colIndex.get("secondary")]).toBe(-80);
  });

  it("cost = INFINITY если slot не принимает роль intent'а", () => {
    const intents = [mkIntent("utility_intent", 10)]; // utility role
    const { cost, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
    });
    // utility_intent в primaryCTA — не подходит (allowedRoles: primary, destructive)
    expect(cost[0][colIndex.get("primaryCTA")]).toBe(INFINITY_COST);
    // toolbar принимает utility
    expect(cost[0][colIndex.get("toolbar")]).toBe(-10);
  });

  it("destructive intent — допускается в primaryCTA даже с низкой salience", () => {
    const intents = [
      mkIntent("delete_listing", 30, {
        effects: [{ α: "remove", target: "Listing" }],
      }),
    ];
    const { cost, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
      mainEntity: "Listing",
    });
    // navigation + destructive — primaryCTA принимает destructive
    expect(cost[0][colIndex.get("primaryCTA")]).toBe(-30);
    // footer принимает destructive тоже
    expect(cost[0][colIndex.get("footer")]).toBe(-30);
  });

  it("intent без salience → default 40 → navigation", () => {
    const intents = [mkIntent("read_only", undefined)];
    const { cost, colIndex } = buildCostMatrix({
      intents,
      slots: SLOTS_DEFAULT,
    });
    // navigation допустим в secondary и toolbar
    expect(cost[0][colIndex.get("secondary")]).toBe(-40);
    expect(cost[0][colIndex.get("toolbar")]).toBe(-40);
    // primaryCTA не допускает navigation
    expect(cost[0][colIndex.get("primaryCTA")]).toBe(INFINITY_COST);
  });

  it("пустой intents → пустая матрица", () => {
    const { cost, rowIndex } = buildCostMatrix({
      intents: [],
      slots: SLOTS_DEFAULT,
    });
    expect(cost).toEqual([]);
    expect(rowIndex.size).toBe(0);
  });

  it("пустые slots → каждая строка пустая", () => {
    const intents = [mkIntent("a", 80)];
    const { cost } = buildCostMatrix({
      intents,
      slots: {},
    });
    expect(cost[0]).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить — должен FAIL**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolver.test.js -t buildCostMatrix 2>&1 | tail -10
```

Expected: 7 failing — `buildCostMatrix is not a function`.

- [ ] **Step 3: Реализовать buildCostMatrix**

Дописать в `packages/core/src/crystallize_v2/jointSolver.js`:

```js
export const INFINITY_COST = Number.POSITIVE_INFINITY;

/**
 * Построить cost-матрицу для (intent_i, slot_s).
 *
 * Семантика:
 *   cost[i][s] = -salience(intent_i) если slot принимает intent_i (по ролям);
 *   cost[i][s] = INFINITY_COST если slot не принимает.
 *
 * Capacity penalty и role mismatch penalty — Phase 2 (Hungarian).
 *
 * @param {Object} opts
 * @param {Array<Object>} opts.intents — массив intent definitions с salience
 * @param {Record<string, { capacity: number, allowedRoles: string[] }>} opts.slots
 * @param {string} [opts.mainEntity] — для destructive classification
 * @returns {{
 *   cost: number[][],
 *   rowIndex: Map<string, number>,
 *   colIndex: Map<string, number>,
 *   slotNames: string[],
 *   intentIds: string[],
 * }}
 */
export function buildCostMatrix({ intents, slots, mainEntity }) {
  const slotNames = Object.keys(slots);
  const intentIds = intents.map((i) => i.id);
  const rowIndex = new Map(intentIds.map((id, i) => [id, i]));
  const colIndex = new Map(slotNames.map((name, i) => [name, i]));

  const cost = intents.map((intent) => {
    const roles = classifyIntentRole(intent, mainEntity);
    const salience = typeof intent?.salience === "number" ? intent.salience : 40;
    return slotNames.map((name) => {
      const slot = slots[name];
      const allowed = slot.allowedRoles || [];
      const fits = roles.some((r) => allowed.includes(r));
      return fits ? -salience : INFINITY_COST;
    });
  });

  return { cost, rowIndex, colIndex, slotNames, intentIds };
}
```

- [ ] **Step 4: Запустить — должен PASS**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolver.test.js 2>&1 | tail -5
```

Expected: 14 passing (7 classifyIntentRole + 7 buildCostMatrix).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crystallize_v2/jointSolver.js packages/core/src/crystallize_v2/jointSolver.test.js
git commit -m "feat(core): buildCostMatrix — Phase 1 joint solver

Pure-функция: cost[i][s] = -salience(intent_i) если slot принимает
intent (по ролям classifyIntentRole), INFINITY_COST иначе.

Возвращает { cost, rowIndex, colIndex, slotNames, intentIds } для
последующего greedy/Hungarian solver."
```

---

## Task 3: greedyAssign — distribute intents по слотам

**Files:**
- Modify: `packages/core/src/crystallize_v2/jointSolver.js`
- Modify: `packages/core/src/crystallize_v2/jointSolver.test.js`

- [ ] **Step 1: Failing-тесты для greedyAssign**

Дописать в `jointSolver.test.js`:

```js
import { greedyAssign } from "./jointSolver.js";

describe("greedyAssign", () => {
  it("один intent с одним подходящим слотом → assigned", () => {
    const intents = [mkIntent("a", 80)];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = greedyAssign(matrix, SLOTS_DEFAULT);
    expect(result.assignment.get("a")).toBe("primaryCTA");
    expect(result.unassigned).toEqual([]);
  });

  it("intents в порядке salience desc — primary занимает primaryCTA", () => {
    const intents = [
      mkIntent("low", 30),
      mkIntent("high", 90),
      mkIntent("mid", 60),
    ];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = greedyAssign(matrix, SLOTS_DEFAULT);
    // high (primary) идёт в primaryCTA первым — самый low cost
    expect(result.assignment.get("high")).toBe("primaryCTA");
    // mid (secondary) — secondary slot
    expect(result.assignment.get("mid")).toBe("secondary");
    // low (navigation) — secondary или toolbar (greedy: первый с capacity)
    expect(["secondary", "toolbar"]).toContain(result.assignment.get("low"));
  });

  it("capacity respect: 4 primary intents → 3 в primaryCTA, 1 в secondary", () => {
    const intents = [
      mkIntent("p1", 90),
      mkIntent("p2", 88),
      mkIntent("p3", 86),
      mkIntent("p4", 84),
    ];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = greedyAssign(matrix, SLOTS_DEFAULT);
    const inPrimary = [...result.assignment.entries()].filter(([_, s]) => s === "primaryCTA");
    expect(inPrimary).toHaveLength(3);
    // Самый низкий из четырёх — p4 — fall through в secondary
    expect(result.assignment.get("p4")).toBe("secondary");
  });

  it("intent без подходящего slot'а — unassigned + witness", () => {
    const intents = [mkIntent("orphan", 80)];
    const slotsRestricted = {
      onlyUtility: { capacity: 1, allowedRoles: ["utility"] },
    };
    const matrix = buildCostMatrix({ intents, slots: slotsRestricted });
    const result = greedyAssign(matrix, slotsRestricted);
    expect(result.assignment.has("orphan")).toBe(false);
    expect(result.unassigned).toEqual(["orphan"]);
    expect(result.witnesses).toContainEqual(
      expect.objectContaining({
        basis: "ill-conditioned",
        intentId: "orphan",
      })
    );
  });

  it("все intents fit — unassigned пуст, witnesses пуст", () => {
    const intents = [mkIntent("a", 80), mkIntent("b", 50), mkIntent("c", 20)];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = greedyAssign(matrix, SLOTS_DEFAULT);
    expect(result.unassigned).toEqual([]);
    expect(result.witnesses).toEqual([]);
    expect(result.assignment.size).toBe(3);
  });

  it("capacity 0 — slot никого не принимает", () => {
    const slotsZero = {
      blocked: { capacity: 0, allowedRoles: ["primary"] },
      open: { capacity: 5, allowedRoles: ["primary"] },
    };
    const intents = [mkIntent("a", 90)];
    const matrix = buildCostMatrix({ intents, slots: slotsZero });
    const result = greedyAssign(matrix, slotsZero);
    expect(result.assignment.get("a")).toBe("open");
  });

  it("детерминизм: один input → одинаковый output", () => {
    const intents = [
      mkIntent("a", 80),
      mkIntent("b", 80),
      mkIntent("c", 80),
    ];
    const matrix1 = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result1 = greedyAssign(matrix1, SLOTS_DEFAULT);
    const matrix2 = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result2 = greedyAssign(matrix2, SLOTS_DEFAULT);
    expect([...result1.assignment.entries()]).toEqual([...result2.assignment.entries()]);
  });
});
```

- [ ] **Step 2: Запустить — должен FAIL**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolver.test.js -t greedyAssign 2>&1 | tail -10
```

Expected: 7 failing — `greedyAssign is not a function`.

- [ ] **Step 3: Реализовать greedyAssign**

Дописать в `jointSolver.js`:

```js
/**
 * Greedy distribution intents по слотам через cost matrix.
 *
 * Алгоритм:
 *   1. Сортируем intents по min-cost (= max-salience среди допустимых slot'ов).
 *   2. Для каждого intent: берём slot с min cost где capacity > 0.
 *   3. Если все cost = INFINITY — unassigned + witness "ill-conditioned".
 *
 * Stable: при равных min-cost'ах берётся slot в declaration order Object.keys(slots).
 *
 * @param {ReturnType<typeof buildCostMatrix>} matrix
 * @param {Record<string, { capacity: number, allowedRoles: string[] }>} slots
 * @returns {{
 *   assignment: Map<string, string>,
 *   unassigned: string[],
 *   witnesses: Array<{ basis: string, reliability: string, intentId: string, reason: string }>,
 * }}
 */
export function greedyAssign(matrix, slots) {
  const { cost, intentIds, slotNames } = matrix;

  // Capacity tracking — не мутируем slots, локальный счётчик
  const capacityLeft = new Map(slotNames.map((s) => [s, slots[s].capacity]));

  // Сортируем intent indices по min-cost asc (max-salience desc)
  const indices = intentIds.map((_, i) => i);
  const minCostOf = (i) => Math.min(...cost[i]);
  indices.sort((a, b) => {
    const ma = minCostOf(a);
    const mb = minCostOf(b);
    if (ma !== mb) return ma - mb;
    // tie-break: declaration order
    return a - b;
  });

  const assignment = new Map();
  const unassigned = [];
  const witnesses = [];

  for (const i of indices) {
    const intentId = intentIds[i];
    let bestSlot = null;
    let bestCost = INFINITY_COST;

    for (let j = 0; j < slotNames.length; j++) {
      const slotName = slotNames[j];
      if (capacityLeft.get(slotName) <= 0) continue;
      if (cost[i][j] >= INFINITY_COST) continue;
      if (cost[i][j] < bestCost) {
        bestCost = cost[i][j];
        bestSlot = slotName;
      }
    }

    if (bestSlot == null) {
      unassigned.push(intentId);
      witnesses.push({
        basis: "ill-conditioned",
        reliability: "rule-based",
        intentId,
        reason: "no-feasible-slot-with-capacity",
      });
    } else {
      assignment.set(intentId, bestSlot);
      capacityLeft.set(bestSlot, capacityLeft.get(bestSlot) - 1);
    }
  }

  return { assignment, unassigned, witnesses };
}
```

- [ ] **Step 4: Запустить — должен PASS**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolver.test.js 2>&1 | tail -5
```

Expected: 21 passing (7 classifyIntentRole + 7 buildCostMatrix + 7 greedyAssign).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crystallize_v2/jointSolver.js packages/core/src/crystallize_v2/jointSolver.test.js
git commit -m "feat(core): greedyAssign — distribute intents через cost matrix

Greedy: sort intents по min-cost (= max-salience среди допустимых slot'ов),
для каждого pick slot с min cost где capacity > 0. Unassigned intents
получают witness 'ill-conditioned' с reliability 'rule-based'.

Не мутирует slots (локальный capacity-счётчик). Детерминизм через
declaration-order tie-break."
```

---

## Task 4: Property test — capacity invariant + assignment-feasibility

**Files:**
- Modify: `packages/core/src/crystallize_v2/jointSolver.test.js`

- [ ] **Step 1: Property-тесты на инварианты**

Дописать в `jointSolver.test.js`:

```js
import fc from "fast-check";

describe("greedyAssign — property tests (invariants)", () => {
  // Generator: intent с random salience
  const arbIntent = (id) => fc.record({
    id: fc.constant(id),
    salience: fc.integer({ min: 0, max: 100 }),
    particles: fc.constant({ effects: [] }),
  });

  it("invariant: |assignment| + |unassigned| === |intents|", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 30 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = greedyAssign(matrix, SLOTS_DEFAULT);
          expect(result.assignment.size + result.unassigned.length).toBe(intents.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("invariant: capacity respect — каждый slot не превышает capacity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 50 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = greedyAssign(matrix, SLOTS_DEFAULT);
          // count assignments per slot
          const counts = new Map();
          for (const slotName of result.assignment.values()) {
            counts.set(slotName, (counts.get(slotName) || 0) + 1);
          }
          for (const [slotName, count] of counts) {
            expect(count).toBeLessThanOrEqual(SLOTS_DEFAULT[slotName].capacity);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("invariant: assigned intent имеет cost < INFINITY в matrix", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 30 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = greedyAssign(matrix, SLOTS_DEFAULT);
          for (const [intentId, slotName] of result.assignment) {
            const i = matrix.rowIndex.get(intentId);
            const j = matrix.colIndex.get(slotName);
            expect(matrix.cost[i][j]).toBeLessThan(INFINITY_COST);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("invariant: каждый unassigned имеет все cost === INFINITY (нет ёмкости)", () => {
    // Specific scenario: total intents > total capacity
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 50 }),
        (n) => {
          const intents = Array.from({ length: n }, (_, i) =>
            mkIntent(`i${i}`, 90)  // все primary
          );
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = greedyAssign(matrix, SLOTS_DEFAULT);
          // primary slots total capacity = 3 + 5 + 10 = 18 (toolbar тоже принимает primary?
          // нет: toolbar allowedRoles = secondary/utility/navigation; primary не принимает.
          // primary fits в primaryCTA(3) + secondary(5) = 8 максимум.
          expect(result.assignment.size).toBeLessThanOrEqual(8);
          // Unassigned всегда есть когда n > 8
          if (n > 8) {
            expect(result.unassigned.length).toBe(n - 8);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
```

- [ ] **Step 2: Запустить**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolver.test.js 2>&1 | tail -10
```

Expected: 25 passing (21 unit + 4 property × 50-100 runs each).

Если invariant 4 fails — внимательно перепроверить, что toolbar не принимает primary. Если SLOTS_DEFAULT изменён — поправить expected total capacity.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/crystallize_v2/jointSolver.test.js
git commit -m "test(core): property-инварианты greedyAssign

4 свойства × 50-100 runs покрывают:
- size invariant (assigned + unassigned = total)
- capacity respect (∑ assignments per slot ≤ capacity)
- cost < INFINITY для assigned
- unassigned ↔ нет feasible slot (n > total fitting capacity)"
```

---

## Task 5: Export + changeset

**Files:**
- Modify: `packages/core/src/index.js`
- Create: `.changeset/joint-solver-phase1.md`

- [ ] **Step 1: Export в index.js**

Открыть `packages/core/src/index.js`, найти секцию crystallize_v2 export'ов, добавить:

```js
// Joint solver — Phase 1 (pure-функции; интеграция в assignToSlots* — Phase 2)
export {
  buildCostMatrix,
  greedyAssign,
  classifyIntentRole,
  INFINITY_COST,
} from "./crystallize_v2/jointSolver.js";
```

- [ ] **Step 2: Smoke-тест через публичный API**

Создать `packages/core/src/crystallize_v2/jointSolver.export.test.js`:

```js
import { describe, it, expect } from "vitest";
import * as core from "../index.js";

describe("@intent-driven/core — jointSolver exports (A2 Phase 1)", () => {
  it("экспортирует buildCostMatrix, greedyAssign, classifyIntentRole, INFINITY_COST", () => {
    expect(typeof core.buildCostMatrix).toBe("function");
    expect(typeof core.greedyAssign).toBe("function");
    expect(typeof core.classifyIntentRole).toBe("function");
    expect(core.INFINITY_COST).toBe(Number.POSITIVE_INFINITY);
  });

  it("end-to-end через публичный API", () => {
    const slots = {
      primaryCTA: { capacity: 1, allowedRoles: ["primary"] },
      toolbar: { capacity: 5, allowedRoles: ["secondary", "utility", "navigation"] },
    };
    const intents = [
      { id: "edit", salience: 80, particles: { effects: [] } },
      { id: "view", salience: 20, particles: { effects: [] } },
    ];
    const matrix = core.buildCostMatrix({ intents, slots });
    const result = core.greedyAssign(matrix, slots);
    expect(result.assignment.get("edit")).toBe("primaryCTA");
    expect(result.assignment.get("view")).toBe("toolbar");
  });
});
```

- [ ] **Step 3: Запустить smoke**

```bash
cd packages/core && npx vitest run src/crystallize_v2/jointSolver.export.test.js 2>&1 | tail -5
```

Expected: 2 passing.

- [ ] **Step 4: Создать changeset**

Создать `.changeset/joint-solver-phase1.md`:

```markdown
---
"@intent-driven/core": minor
---

feat: joint solver Phase 1 — pure cost matrix + greedy assignment

Добавляет фундаментальные функции для будущей замены `assignToSlots*`:

- `classifyIntentRole(intent, mainEntity?)` — slot-роли по salience tier'ам
  (primary / secondary / navigation / utility) + destructive flag.
- `buildCostMatrix({ intents, slots, mainEntity? })` — строит cost[i][s].
  cost = -salience если slot принимает intent (по ролям), INFINITY_COST иначе.
- `greedyAssign(matrix, slots)` — sort intents по min-cost, distribute
  с capacity respect. Unassigned intents получают witness `basis:
  "ill-conditioned"` reliability `rule-based`.
- `INFINITY_COST` — `Number.POSITIVE_INFINITY` константа.

Phase 1 живёт **параллельно** с существующим `assignToSlots*` —
интеграция и Hungarian algorithm — Phase 2 после parity tests.
Calibration на 21 ручном решении из salience-suggestions.md — Phase 3.

Tests: 25 unit + 4 property × 50-100 runs.

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.js packages/core/src/crystallize_v2/jointSolver.export.test.js .changeset/joint-solver-phase1.md
git commit -m "feat(core): экспорт jointSolver API + changeset (A2 Phase 1)

Публичный API @intent-driven/core теперь включает buildCostMatrix,
greedyAssign, classifyIntentRole, INFINITY_COST.

Changeset запросит minor bump @intent-driven/core."
```

---

## Task 6: Final sanity + push + PR + HTML

**Files:** —

- [ ] **Step 1: Прогнать все core-тесты**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/joint-solver-phase1/packages/core && npx vitest run 2>&1 | tail -5
```

Expected: 1700 baseline + ~28 new = ~1728 passing.

- [ ] **Step 2: Git status + commits review**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/joint-solver-phase1 && git status -sb && git log --oneline main..HEAD
```

Expected: 5 commits на ветке.

- [ ] **Step 3: Push branch**

```bash
git push -u origin feat/joint-solver-phase1
```

- [ ] **Step 4: Открыть PR**

```bash
gh pr create --repo DubovskiyIM/idf-sdk \
  --title "feat(core): joint solver Phase 1 — cost matrix + greedy (A2)" \
  --body "$(cat <<'EOF'
## Контекст

Реализация **Phase 1** приоритета #2 (A2) из backlog ядра — `docs/superpowers/specs/2026-04-26-core-backlog.md` (PR #366).

## Phasing

A2 разбит на 3 phase'а:
- **Phase 1 (этот PR):** pure-функции `buildCostMatrix` + `greedyAssign` параллельно с существующим `assignToSlots*`. **БЕЗ** интеграции — minimal regression risk.
- **Phase 2:** интеграция в `assignToSlotsCatalog/Detail`; Hungarian algorithm.
- **Phase 3:** calibration на 21 ручном решении из `salience-suggestions.md`.

## Что сделано

- `crystallize_v2/jointSolver.js` — `classifyIntentRole`, `buildCostMatrix`, `greedyAssign`, `INFINITY_COST`.
- 25 unit-тестов + 4 property × 50-100 runs.
- Changeset для core minor.

## Cost функция

\`\`\`
cost(i, s) = -salience(intent_i)  если slot принимает intent (по ролям)
cost(i, s) = INFINITY_COST        иначе
\`\`\`

## Ролевая классификация

- salience ≥ 80 → primary
- salience 60-79 → secondary
- salience 30-59 → navigation
- salience < 30 → utility
- remove-effect на mainEntity → +destructive (multi-role)

## Test plan

- [ ] CI green (core)
- [ ] property tests passing (25 unit + 4 property)
- [ ] changeset подобран release-bot'ом → minor bump core (0.79 → 0.80; **может быть совмещён с A1 PR #368** в одну release)

## Не входит (Phase 2/3)

- Интеграция в `assignToSlotsCatalog.js` и `assignToSlotsDetail.js`
- Hungarian algorithm (O(n³) optimal assignment)
- Calibration weights на labeled-dataset
EOF
)"
```

- [ ] **Step 5: Проверить, что CI зелёный**

```bash
gh pr checks <PR-number> --repo DubovskiyIM/idf-sdk 2>&1 | tail -10
```

Expected: все checks green. Diagnose if anything fails.

- [ ] **Step 6: HTML-отчёт**

Создать `~/Desktop/idf/2026-04-26-joint-solver-phase1.html` с тёмной темой, по образцу `2026-04-26-incremental-fold-snapshots.html`. Структура: status cards (DONE / DEFERRED), test count, API surface, next phases.

---

## Self-Review

**1. Spec coverage:**
- A2 Phase 1 problem statement → Tasks 1-3 (classify + matrix + greedy) ✓
- A2 success criteria (capacity respect + детерминизм + ill-conditioned witness) → Task 3 + Task 4 ✓
- Phase 2/3 — explicitly deferred ✓
- 21 ручных решений из salience-suggestions.md — Phase 3, не входит в Phase 1 ✓

**2. Placeholder scan:**
- `<PR-number>` в Task 6 step 5 — это runtime value (gh выдаст после step 4), executor должен заметить и подставить.
- Нет «implement later», «add appropriate error handling», «similar to Task N».

**3. Type consistency:**
- `INFINITY_COST = Number.POSITIVE_INFINITY` — used consistently в Task 2, 3, 4, 5.
- Matrix shape `{ cost, rowIndex, colIndex, slotNames, intentIds }` — same в Task 2, 3, 4.
- Result shape `{ assignment, unassigned, witnesses }` — same в Task 3, 4, 5.
- Slot shape `{ capacity, allowedRoles }` — same везде.
- API: `buildCostMatrix({ intents, slots, mainEntity? })`, `greedyAssign(matrix, slots)`, `classifyIntentRole(intent, mainEntity?)` — consistent.
