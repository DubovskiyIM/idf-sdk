# Joint solver Phase 2a — Hungarian algorithm

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Реализовать `hungarianAssign(matrix, slots)` — optimal O(n³) bipartite assignment как drop-in replacement для `greedyAssign`. Same input/output shape; гарантия global optimum (минимум суммарного cost).

**Architecture:** Self-implemented Munkres/Hungarian algorithm в `crystallize_v2/hungarianAssign.js`. Slots с capacity > 1 разворачиваются в virtual single-capacity slot-slots (N = ∑ capacity). Padding до квадратной матрицы slack-rows (cost = 0). Pure-функция, не трогает `greedyAssign` — оба сосуществуют, callers выбирают.

**Tech Stack:** core@0.82.0, ES modules, vitest, fast-check.

**Backlog ref:** `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.

---

## File Structure

**Create:**
- `packages/core/src/crystallize_v2/hungarianAssign.js` — core algorithm + public `hungarianAssign`.
- `packages/core/src/crystallize_v2/hungarianAssign.test.js` — unit + property tests.
- `.changeset/joint-solver-phase2a-hungarian.md` — minor bump.

**Modify:**
- `packages/core/src/index.js` — экспортировать `hungarianAssign`, `hungarianMatch`.

**Не трогаем:**
- `crystallize_v2/jointSolver.js` (greedyAssign, classifyIntentRole, buildCostMatrix остаются).
- `assignToSlotsCatalog/Detail.js` (Phase 2c/2d).

---

## Hungarian algorithm (минимальная спецификация)

Классический Munkres O(n³). Pseudocode:

```
input: square cost matrix C[n][n], finite values
output: assignment[n] — permutation минимизирующая ∑ C[i][assignment[i]]

1. row reduce: subtract min of each row
2. col reduce: subtract min of each col
3. cover all zeros with min lines
4. if lines == n: extract assignment from zeros
   else: adjust matrix (subtract uncovered min from uncovered, add to doubly-covered), goto 3
```

Реализация — single function `hungarianMatch(squareCost) → number[]`. Square matrix входной инвариант (caller обеспечивает padding).

**Wrapping для capacity > 1:**

`expandSlots({ A: capacity 3, B: capacity 2 }) → ["A#0","A#1","A#2","B#0","B#1"]` (5 virtual slots).

Cost от intent_i в virtual slot `X#k` равен `cost[i][X]` (одинаковый для всех k слотов одного physical slot'а).

**Padding до square:**

n intents, N virtual slots. Matrix размер `max(n, N) × max(n, N)`:
- если n < N: добавить `N-n` slack rows с cost = 0 для всех колонок (intent unassigned)
- если n > N: добавить `n-N` slack columns с cost = INFINITY (intent не помещается, witness ill-conditioned)

**Финальное mapping:** virtual slot → physical slot через "X#k" → "X". `assignment[real_intent_i] === slack_col` → unassigned.

---

## Task 0: Worktree sanity + baseline

**Files:** —

- [ ] **Step 1: Подтвердить worktree, version, deps**

```bash
cd ~/WebstormProjects/idf-sdk/.worktrees/joint-solver-phase2a
git status -sb
node -p "require('./packages/core/package.json').version"
```

Expected: branch `feat/joint-solver-phase2a-hungarian`, version `0.82.0`.

- [ ] **Step 2: Прогнать core suite — baseline**

```bash
cd packages/core && npx vitest run 2>&1 | tail -5
```

Expected: ≥1727 passing (с A1+A2 Phase 1 merged). Если что-то failing — STOP.

- [ ] **Step 3: Подтвердить jointSolver есть на main**

```bash
ls packages/core/src/crystallize_v2/jointSolver.js && grep "greedyAssign" packages/core/src/index.js
```

Expected: файл exists, экспорт есть.

---

## Task 1: hungarianMatch — core algorithm на square cost matrix

**Files:**
- Create: `packages/core/src/crystallize_v2/hungarianAssign.js`
- Create: `packages/core/src/crystallize_v2/hungarianAssign.test.js`

- [ ] **Step 1: Failing-тест для hungarianMatch**

Создать `hungarianAssign.test.js`:

```js
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { hungarianMatch } from "./hungarianAssign.js";

describe("hungarianMatch — square cost matrix", () => {
  it("identity 1x1", () => {
    expect(hungarianMatch([[5]])).toEqual([0]);
  });

  it("2x2 obvious — diagonal optimal", () => {
    // C = [[1, 100], [100, 1]] → assign 0→0, 1→1, total = 2
    const result = hungarianMatch([[1, 100], [100, 1]]);
    expect(result).toEqual([0, 1]);
  });

  it("2x2 cross — anti-diagonal optimal", () => {
    // C = [[100, 1], [1, 100]] → assign 0→1, 1→0, total = 2
    const result = hungarianMatch([[100, 1], [1, 100]]);
    expect(result).toEqual([1, 0]);
  });

  it("3x3 — пример Munkres", () => {
    // Classical Munkres example: optimal total = 13
    // C = [[7, 53, 183], [38, 99, 11], [10, 21, 27]]
    // Optimal: 0→0(7) + 1→2(11) + 2→1(21) = 39 — но classical solution
    // Let's use simpler:
    // C = [[1, 2, 3], [2, 4, 6], [3, 6, 9]]
    // Optimal: 0→2(3) + 1→1(4) + 2→0(3) = 10
    // Or: 0→0(1) + 1→1(4) + 2→2(9) = 14 → worse
    // Actually best is anti-diag (3+4+3=10).
    const result = hungarianMatch([[1, 2, 3], [2, 4, 6], [3, 6, 9]]);
    const cost = result.reduce((s, c, r) => s + [[1,2,3],[2,4,6],[3,6,9]][r][c], 0);
    expect(cost).toBe(10);
  });

  it("permutation invariance: assignment — bijection", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }).chain(n =>
          fc.array(fc.array(fc.integer({ min: 0, max: 100 }), { minLength: n, maxLength: n }), { minLength: n, maxLength: n })
        ),
        (matrix) => {
          const result = hungarianMatch(matrix);
          // bijection: каждый assignment[i] уникален
          expect(new Set(result).size).toBe(matrix.length);
          // в диапазоне
          for (const c of result) {
            expect(c).toBeGreaterThanOrEqual(0);
            expect(c).toBeLessThan(matrix.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("optimality: Hungarian ≤ любой другой permutation", () => {
    // Brute-force vs Hungarian на малых n
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }).chain(n =>
          fc.array(fc.array(fc.integer({ min: 0, max: 100 }), { minLength: n, maxLength: n }), { minLength: n, maxLength: n })
        ),
        (matrix) => {
          const n = matrix.length;
          const hung = hungarianMatch(matrix);
          const hungCost = hung.reduce((s, c, r) => s + matrix[r][c], 0);
          // brute-force over all permutations
          const perms = (function gen(arr) {
            if (arr.length <= 1) return [arr];
            const res = [];
            for (let i = 0; i < arr.length; i++) {
              const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
              for (const p of gen(rest)) res.push([arr[i], ...p]);
            }
            return res;
          })(Array.from({ length: n }, (_, i) => i));
          let bruteCost = Infinity;
          for (const p of perms) {
            const c = p.reduce((s, col, row) => s + matrix[row][col], 0);
            if (c < bruteCost) bruteCost = c;
          }
          expect(hungCost).toBe(bruteCost);
        }
      ),
      { numRuns: 30 }
    );
  });
});
```

- [ ] **Step 2: Запустить — должен FAIL**

```bash
cd packages/core && npx vitest run src/crystallize_v2/hungarianAssign.test.js 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Реализовать hungarianMatch**

Создать `packages/core/src/crystallize_v2/hungarianAssign.js`:

```js
/**
 * Hungarian algorithm — optimal bipartite assignment O(n³).
 *
 * Реализация Munkres method для квадратной cost matrix. Возвращает
 * permutation, минимизирующую ∑ C[i][assignment[i]].
 *
 * Для rectangular (n intents × m slots) или multi-capacity slots — wrap
 * через hungarianAssign который padding'ует до square.
 *
 * Backlog: docs/superpowers/specs/2026-04-26-core-backlog.md § A2.
 * Plan: docs/superpowers/plans/2026-04-26-joint-solver-phase2a-hungarian.md
 */

const STAR = 1;
const PRIME = 2;

/**
 * Find assignment минимизирующий total cost.
 *
 * @param {number[][]} squareCost — n×n матрица finite cost
 * @returns {number[]} — assignment[row] = col
 */
export function hungarianMatch(squareCost) {
  const n = squareCost.length;
  if (n === 0) return [];

  // Deep-clone чтобы не мутировать input
  const cost = squareCost.map((row) => [...row]);

  // Step 1: row reduction — вычитаем min каждой строки
  for (let i = 0; i < n; i++) {
    const m = Math.min(...cost[i]);
    for (let j = 0; j < n; j++) cost[i][j] -= m;
  }

  // Step 2: column reduction
  for (let j = 0; j < n; j++) {
    let m = Infinity;
    for (let i = 0; i < n; i++) m = Math.min(m, cost[i][j]);
    for (let i = 0; i < n; i++) cost[i][j] -= m;
  }

  const mask = Array.from({ length: n }, () => new Array(n).fill(0));
  const rowCovered = new Array(n).fill(false);
  const colCovered = new Array(n).fill(false);

  // Step 3: star initial zeros (greedy non-conflicting)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (cost[i][j] === 0 && !rowCovered[i] && !colCovered[j]) {
        mask[i][j] = STAR;
        rowCovered[i] = true;
        colCovered[j] = true;
      }
    }
  }
  rowCovered.fill(false);
  colCovered.fill(false);

  let step = 4;
  let zRow = -1;
  let zCol = -1;

  while (true) {
    if (step === 4) {
      // Cover columns containing starred zeros
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (mask[i][j] === STAR) colCovered[j] = true;
        }
      }
      const coveredCount = colCovered.filter(Boolean).length;
      if (coveredCount >= n) break;
      step = 6;
    }

    if (step === 6) {
      // Find uncovered zero — prime it
      let found = false;
      while (!found) {
        let r = -1, c = -1;
        for (let i = 0; i < n && r === -1; i++) {
          if (rowCovered[i]) continue;
          for (let j = 0; j < n && r === -1; j++) {
            if (!colCovered[j] && cost[i][j] === 0) { r = i; c = j; }
          }
        }
        if (r === -1) {
          step = 8;
          break;
        }
        mask[r][c] = PRIME;
        // если в строке есть STAR — cover row, uncover col STAR'а
        let starCol = -1;
        for (let j = 0; j < n; j++) {
          if (mask[r][j] === STAR) { starCol = j; break; }
        }
        if (starCol === -1) {
          zRow = r;
          zCol = c;
          step = 7;
          found = true;
        } else {
          rowCovered[r] = true;
          colCovered[starCol] = false;
        }
      }
    }

    if (step === 7) {
      // Augmenting path: alternating PRIME → STAR
      const path = [[zRow, zCol]];
      while (true) {
        const last = path[path.length - 1];
        // ищем STAR в столбце last[1]
        let r = -1;
        for (let i = 0; i < n; i++) {
          if (mask[i][last[1]] === STAR) { r = i; break; }
        }
        if (r === -1) break;
        path.push([r, last[1]]);
        // ищем PRIME в строке r
        let c = -1;
        for (let j = 0; j < n; j++) {
          if (mask[r][j] === PRIME) { c = j; break; }
        }
        path.push([r, c]);
      }
      // unstar starred, star primed
      for (const [r, c] of path) {
        if (mask[r][c] === STAR) mask[r][c] = 0;
        else if (mask[r][c] === PRIME) mask[r][c] = STAR;
      }
      // erase all primes, uncover all
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (mask[i][j] === PRIME) mask[i][j] = 0;
        }
      }
      rowCovered.fill(false);
      colCovered.fill(false);
      step = 4;
      continue;
    }

    if (step === 8) {
      // Adjust matrix: subtract uncovered min from uncovered, add to doubly-covered
      let m = Infinity;
      for (let i = 0; i < n; i++) {
        if (rowCovered[i]) continue;
        for (let j = 0; j < n; j++) {
          if (!colCovered[j] && cost[i][j] < m) m = cost[i][j];
        }
      }
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (rowCovered[i]) cost[i][j] += m;
          if (!colCovered[j]) cost[i][j] -= m;
        }
      }
      step = 6;
    }
  }

  // Extract assignment
  const result = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (mask[i][j] === STAR) result[i] = j;
    }
  }
  return result;
}
```

- [ ] **Step 4: Запустить — должен PASS**

```bash
cd packages/core && npx vitest run src/crystallize_v2/hungarianAssign.test.js 2>&1 | tail -10
```

Expected: 5 passing. Если property test про optimality fails — bug в импликации, debug.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crystallize_v2/hungarianAssign.js packages/core/src/crystallize_v2/hungarianAssign.test.js
git commit -m "feat(core): hungarianMatch — Munkres O(n³) на square cost matrix

Pure-функция: hungarianMatch(squareCost) → assignment[row] = col,
permutation минимизирующая ∑ C[i][a[i]].

Тесты:
- 4 unit (1x1, 2x2 diagonal/anti-diagonal, 3x3)
- 2 property × 30-50 runs:
  - bijection invariant (each col used exactly once)
  - optimality (== brute-force minimum для n ≤ 4)

Backlog: § A2 (Phase 2a)
Plan: docs/superpowers/plans/2026-04-26-joint-solver-phase2a-hungarian.md"
```

---

## Task 2: expandSlots — capacity > 1 → virtual single-capacity slots

**Files:**
- Modify: `hungarianAssign.js`
- Modify: `hungarianAssign.test.js`

- [ ] **Step 1: Failing-тесты**

Дописать в `hungarianAssign.test.js`:

```js
import { expandSlots } from "./hungarianAssign.js";

describe("expandSlots", () => {
  it("capacity 1 — без разворачивания", () => {
    const slots = { A: { capacity: 1 }, B: { capacity: 1 } };
    expect(expandSlots(slots)).toEqual([
      { virtualName: "A#0", physicalName: "A" },
      { virtualName: "B#0", physicalName: "B" },
    ]);
  });

  it("capacity > 1 — разворачивается в N slot-slots", () => {
    const slots = { A: { capacity: 3 }, B: { capacity: 2 } };
    const expanded = expandSlots(slots);
    expect(expanded).toHaveLength(5);
    expect(expanded[0]).toEqual({ virtualName: "A#0", physicalName: "A" });
    expect(expanded[2]).toEqual({ virtualName: "A#2", physicalName: "A" });
    expect(expanded[3]).toEqual({ virtualName: "B#0", physicalName: "B" });
  });

  it("capacity 0 — slot пропускается", () => {
    const slots = { A: { capacity: 0 }, B: { capacity: 2 } };
    const expanded = expandSlots(slots);
    expect(expanded).toHaveLength(2);
    expect(expanded[0].physicalName).toBe("B");
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

```bash
cd packages/core && npx vitest run src/crystallize_v2/hungarianAssign.test.js -t expandSlots 2>&1 | tail -5
```

- [ ] **Step 3: Реализовать**

Дописать в `hungarianAssign.js`:

```js
/**
 * Развернуть slots с capacity > 1 в virtual single-capacity slot-slots.
 *
 * @param {Record<string, { capacity: number }>} slots
 * @returns {Array<{ virtualName: string, physicalName: string }>}
 */
export function expandSlots(slots) {
  const result = [];
  for (const [name, slot] of Object.entries(slots)) {
    const cap = slot.capacity || 0;
    for (let k = 0; k < cap; k++) {
      result.push({ virtualName: `${name}#${k}`, physicalName: name });
    }
  }
  return result;
}
```

- [ ] **Step 4: PASS**

```bash
cd packages/core && npx vitest run src/crystallize_v2/hungarianAssign.test.js 2>&1 | tail -5
```

Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crystallize_v2/hungarianAssign.js packages/core/src/crystallize_v2/hungarianAssign.test.js
git commit -m "feat(core): expandSlots — virtual single-capacity slot-slots

Разворачивает slot {A: capacity:3} в [A#0, A#1, A#2] для применения
Hungarian'а к multi-capacity случаю. capacity 0 — пропускается."
```

---

## Task 3: hungarianAssign — main API

**Files:**
- Modify: `hungarianAssign.js`
- Modify: `hungarianAssign.test.js`

- [ ] **Step 1: Failing-тесты**

Дописать в `hungarianAssign.test.js`:

```js
import { hungarianAssign } from "./hungarianAssign.js";
import { buildCostMatrix } from "./jointSolver.js";

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

describe("hungarianAssign — drop-in replacement для greedyAssign", () => {
  it("один intent → правильный slot", () => {
    const intents = [mkIntent("a", 80)];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = hungarianAssign(matrix, SLOTS_DEFAULT);
    expect(result.assignment.get("a")).toBe("primaryCTA");
    expect(result.unassigned).toEqual([]);
    expect(result.witnesses).toEqual([]);
  });

  it("4 primary intents → 3 в primaryCTA, 1 в secondary (capacity)", () => {
    const intents = [
      mkIntent("p1", 90),
      mkIntent("p2", 88),
      mkIntent("p3", 86),
      mkIntent("p4", 84),
    ];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = hungarianAssign(matrix, SLOTS_DEFAULT);
    const inPrimary = [...result.assignment.entries()].filter(([_, s]) => s === "primaryCTA");
    expect(inPrimary).toHaveLength(3);
    expect(result.assignment.get("p4")).toBe("secondary");
  });

  it("intent без подходящего slot'а → unassigned + witness", () => {
    const intents = [mkIntent("orphan", 80)];
    const slotsRestricted = {
      onlyUtility: { capacity: 1, allowedRoles: ["utility"] },
    };
    const matrix = buildCostMatrix({ intents, slots: slotsRestricted });
    const result = hungarianAssign(matrix, slotsRestricted);
    expect(result.assignment.has("orphan")).toBe(false);
    expect(result.unassigned).toEqual(["orphan"]);
    expect(result.witnesses).toContainEqual(
      expect.objectContaining({
        basis: "ill-conditioned",
        intentId: "orphan",
      })
    );
  });

  it("больше intents чем total capacity — extra unassigned", () => {
    // primary fits только в primaryCTA (3) + secondary (5) = 8
    const n = 12;
    const intents = Array.from({ length: n }, (_, i) =>
      mkIntent(`p${i}`, 90)
    );
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = hungarianAssign(matrix, SLOTS_DEFAULT);
    expect(result.assignment.size).toBe(8);
    expect(result.unassigned).toHaveLength(4);
  });

  it("результат идентичен greedy на тривиальных кейсах (один primary)", () => {
    const intents = [mkIntent("a", 80)];
    const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
    const result = hungarianAssign(matrix, SLOTS_DEFAULT);
    expect(result.assignment.get("a")).toBe("primaryCTA");
  });
});
```

- [ ] **Step 2: FAIL**

```bash
cd packages/core && npx vitest run src/crystallize_v2/hungarianAssign.test.js -t hungarianAssign 2>&1 | tail -10
```

- [ ] **Step 3: Реализовать hungarianAssign**

Дописать в `hungarianAssign.js`:

```js
import { INFINITY_COST } from "./jointSolver.js";

/**
 * Optimal bipartite assignment intents → slots через Hungarian.
 *
 * Drop-in replacement для greedyAssign из jointSolver.js. Same shape
 * входа/выхода. Гарантирует global optimum (минимум ∑ cost) против
 * greedy local optimum.
 *
 * @param {ReturnType<typeof buildCostMatrix>} matrix
 * @param {Record<string, { capacity: number, allowedRoles: string[] }>} slots
 * @returns {{
 *   assignment: Map<string, string>,
 *   unassigned: string[],
 *   witnesses: Array<{ basis: string, reliability: string, intentId: string, reason: string }>,
 * }}
 */
export function hungarianAssign(matrix, slots) {
  const { cost, intentIds, slotNames, colIndex } = matrix;
  const n = intentIds.length;

  // Развернуть slots в virtual single-capacity slot-slots
  const expanded = expandSlots(slots);
  const N = expanded.length;

  // Square size = max(n, N); pad slack rows/cols
  const size = Math.max(n, N);
  // Большое финитное значение для INFINITY (Hungarian не работает с Infinity)
  const BIG = 1_000_000;

  const square = Array.from({ length: size }, () =>
    new Array(size).fill(0)
  );

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (i >= n) {
        // slack row — slot unassigned (cost 0)
        square[i][j] = 0;
      } else if (j >= N) {
        // slack column — intent unassigned (cost INFINITY → BIG)
        square[i][j] = BIG;
      } else {
        // real cell: cost от intent_i к slotName expanded[j].physicalName
        const physName = expanded[j].physicalName;
        const physColIdx = colIndex.get(physName);
        const c = cost[i][physColIdx];
        square[i][j] = c >= INFINITY_COST ? BIG : c;
      }
    }
  }

  const assignment = hungarianMatch(square);

  // Извлечь intent → physical slot mapping
  const result = new Map();
  const unassigned = [];
  const witnesses = [];

  for (let i = 0; i < n; i++) {
    const j = assignment[i];
    if (j >= N) {
      // slack column — intent unassigned
      unassigned.push(intentIds[i]);
      witnesses.push({
        basis: "ill-conditioned",
        reliability: "rule-based",
        intentId: intentIds[i],
        reason: "no-feasible-slot-with-capacity",
      });
    } else if (square[i][j] >= BIG) {
      // assigned to BIG cost cell — also unassigned
      unassigned.push(intentIds[i]);
      witnesses.push({
        basis: "ill-conditioned",
        reliability: "rule-based",
        intentId: intentIds[i],
        reason: "no-feasible-slot-with-capacity",
      });
    } else {
      result.set(intentIds[i], expanded[j].physicalName);
    }
  }

  return { assignment: result, unassigned, witnesses };
}
```

- [ ] **Step 4: PASS**

```bash
cd packages/core && npx vitest run src/crystallize_v2/hungarianAssign.test.js 2>&1 | tail -10
```

Expected: 13 passing (5 hungarianMatch + 3 expandSlots + 5 hungarianAssign).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/crystallize_v2/hungarianAssign.js packages/core/src/crystallize_v2/hungarianAssign.test.js
git commit -m "feat(core): hungarianAssign — optimal assignment drop-in для greedyAssign

Same input/output shape, гарантирует global optimum через Munkres.
Wraps hungarianMatch с padding до квадратной матрицы:
- slots.capacity > 1 → expandSlots в virtual single-capacity slot-slots
- INFINITY_COST маппится в BIG (1_000_000) — Hungarian не работает с Infinity
- slack rows/cols для n ≠ N

Backward-compat: greedyAssign не трогается, callers выбирают."
```

---

## Task 4: Property test — Hungarian ≥ Greedy (optimality)

**Files:**
- Modify: `hungarianAssign.test.js`

- [ ] **Step 1: Property-тест на Hungarian ≤ Greedy total cost**

Дописать в `hungarianAssign.test.js`:

```js
import { greedyAssign } from "./jointSolver.js";

describe("hungarianAssign vs greedyAssign — optimality property", () => {
  function totalCost(matrix, result) {
    let s = 0;
    for (const [intentId, slotName] of result.assignment) {
      const i = matrix.rowIndex.get(intentId);
      const j = matrix.colIndex.get(slotName);
      s += matrix.cost[i][j];
    }
    return s;
  }

  it("Hungarian total cost ≤ Greedy total cost (random saliences)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 15 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const greedy = greedyAssign(matrix, SLOTS_DEFAULT);
          const hung = hungarianAssign(matrix, SLOTS_DEFAULT);
          // assignment.size может отличаться (Hungarian может найти feasible
          // там где greedy — нет, или наоборот). Сравниваем total cost
          // только если оба нашли одинаковое количество assignments.
          if (greedy.assignment.size === hung.assignment.size) {
            expect(totalCost(matrix, hung)).toBeLessThanOrEqual(totalCost(matrix, greedy));
          }
          // Hungarian не должен оставлять fewer assigned чем greedy
          expect(hung.assignment.size).toBeGreaterThanOrEqual(greedy.assignment.size);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Hungarian: capacity respect — каждый slot ≤ capacity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 0, maxLength: 30 }),
        (saliences) => {
          const intents = saliences.map((s, i) => mkIntent(`i${i}`, s));
          const matrix = buildCostMatrix({ intents, slots: SLOTS_DEFAULT });
          const result = hungarianAssign(matrix, SLOTS_DEFAULT);
          const counts = new Map();
          for (const slotName of result.assignment.values()) {
            counts.set(slotName, (counts.get(slotName) || 0) + 1);
          }
          for (const [slotName, count] of counts) {
            expect(count).toBeLessThanOrEqual(SLOTS_DEFAULT[slotName].capacity);
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
cd packages/core && npx vitest run src/crystallize_v2/hungarianAssign.test.js 2>&1 | tail -10
```

Expected: 15 passing (13 + 2 property × 50 runs).

Если Hungarian стабильно выдаёт fewer assignments чем greedy — debug, скорее всего bug в padding логике (slack columns).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/crystallize_v2/hungarianAssign.test.js
git commit -m "test(core): property — Hungarian ≤ Greedy total cost

2 свойства × 50 runs:
- Hungarian total cost ≤ Greedy при равном assignment.size
- Hungarian capacity respect (как Greedy)
- Hungarian assignment.size ≥ Greedy (не хуже)"
```

---

## Task 5: Export + changeset + final

**Files:**
- Modify: `packages/core/src/index.js`
- Create: `packages/core/src/crystallize_v2/hungarianAssign.export.test.js`
- Create: `.changeset/joint-solver-phase2a-hungarian.md`

- [ ] **Step 1: Export**

В `packages/core/src/index.js`, секция Joint solver — добавить:

```js
// Joint solver — Phase 1 (pure-функции; интеграция в assignToSlots* — Phase 2)
export {
  classifyIntentRole,
  buildCostMatrix,
  greedyAssign,
  INFINITY_COST,
} from "./crystallize_v2/jointSolver.js";

// Joint solver — Phase 2a: Hungarian (optimal assignment, drop-in для greedy)
export {
  hungarianAssign,
  hungarianMatch,
  expandSlots,
} from "./crystallize_v2/hungarianAssign.js";
```

- [ ] **Step 2: Smoke-тест экспорта**

Создать `hungarianAssign.export.test.js`:

```js
import { describe, it, expect } from "vitest";
import * as core from "../index.js";

describe("@intent-driven/core — hungarianAssign exports (A2 Phase 2a)", () => {
  it("экспортирует hungarianAssign, hungarianMatch, expandSlots", () => {
    expect(typeof core.hungarianAssign).toBe("function");
    expect(typeof core.hungarianMatch).toBe("function");
    expect(typeof core.expandSlots).toBe("function");
  });

  it("end-to-end через публичный API", () => {
    const slots = {
      primary: { capacity: 1, allowedRoles: ["primary"] },
      toolbar: { capacity: 5, allowedRoles: ["secondary", "utility"] },
    };
    const intents = [
      { id: "edit", salience: 80, particles: { effects: [] } },
      { id: "view", salience: 20, particles: { effects: [] } },
    ];
    const matrix = core.buildCostMatrix({ intents, slots });
    const result = core.hungarianAssign(matrix, slots);
    expect(result.assignment.get("edit")).toBe("primary");
    expect(result.assignment.get("view")).toBe("toolbar");
  });
});
```

- [ ] **Step 3: Создать changeset**

`.changeset/joint-solver-phase2a-hungarian.md`:

```markdown
---
"@intent-driven/core": minor
---

feat: joint solver Phase 2a — Hungarian algorithm (optimal assignment)

Добавляет `hungarianAssign(matrix, slots)` — drop-in replacement для
`greedyAssign` с гарантией global optimum через Munkres O(n³).

API:
- `hungarianMatch(squareCost) → number[]` — core algorithm на square
  cost matrix; возвращает permutation минимизирующую ∑ C[i][a[i]].
- `expandSlots(slots) → Array<{ virtualName, physicalName }>` —
  capacity > 1 → virtual single-capacity slot-slots.
- `hungarianAssign(matrix, slots) → { assignment, unassigned, witnesses }`
  — wrap'ит hungarianMatch с padding до квадратной матрицы для
  rectangular n × N случая.

Same shape как `greedyAssign`. INFINITY_COST маппится в BIG (1_000_000)
поскольку Hungarian не работает с Infinity. Slack rows/cols добавляются
для n ≠ N.

Property tests (50 runs each):
- Hungarian total cost ≤ Greedy total cost
- Hungarian assignment.size ≥ Greedy
- Capacity respect
- Bijection invariant (hungarianMatch)
- Optimality vs brute-force (n ≤ 4)

Phase 2b (parity tests против real domains) и Phase 2c/2d (интеграция
в assignToSlotsCatalog/Detail) — отдельные backlog items.

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
Plan: `docs/superpowers/plans/2026-04-26-joint-solver-phase2a-hungarian.md`.
```

- [ ] **Step 4: Прогнать всё**

```bash
cd packages/core && npx vitest run 2>&1 | tail -5
```

Expected: ≥1740 passing.

- [ ] **Step 5: Commit + push + PR**

```bash
git add packages/core/src/index.js packages/core/src/crystallize_v2/hungarianAssign.export.test.js .changeset/joint-solver-phase2a-hungarian.md
git commit -m "feat(core): экспорт hungarianAssign API + changeset (A2 Phase 2a)"

git push -u origin feat/joint-solver-phase2a-hungarian

gh pr create --repo DubovskiyIM/idf-sdk \
  --title "feat(core): joint solver Phase 2a — Hungarian algorithm (A2)" \
  --body "<...PR body...>"
```

- [ ] **Step 6: HTML-отчёт на ~/Desktop/idf/2026-04-26-joint-solver-phase2a-hungarian.html**

Создать с тёмной темой, по образцу предыдущих.

---

## Self-Review

**1. Spec coverage:**
- Phase 2a goal (Hungarian as drop-in) → Tasks 1-3 ✓
- Optimality property → Task 4 ✓
- Phase 2b (parity), 2c/2d (integration) — explicitly deferred ✓
- Capacity > 1 handling → Task 2 (expandSlots) ✓

**2. Placeholder scan:**
- `<...PR body...>` в Task 5 step 5 — TODO для executor: написать в момент создания. Это runtime decision.

**3. Type consistency:**
- `hungarianMatch(squareCost) → number[]` — used in Task 1, 3.
- `expandSlots(slots) → Array<{virtualName, physicalName}>` — Task 2, 3.
- `hungarianAssign(matrix, slots) → { assignment, unassigned, witnesses }` — same shape как greedyAssign, used in Task 3, 4, 5.
- `INFINITY_COST` from jointSolver.js — imported in Task 3.
- `BIG = 1_000_000` — internal constant в hungarianAssign.js.
