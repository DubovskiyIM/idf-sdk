/**
 * Hungarian algorithm — optimal bipartite assignment O(n³).
 *
 * Munkres method для квадратной cost matrix. Drop-in replacement
 * для greedyAssign из jointSolver.js — same input/output shape.
 *
 * Phase 2a (этот PR): pure-функции. Phase 2b — parity tests против
 * real domains. Phase 2c/2d — интеграция в assignToSlotsCatalog/Detail.
 *
 * Backlog: docs/superpowers/specs/2026-04-26-core-backlog.md § A2.
 * Plan: docs/superpowers/plans/2026-04-26-joint-solver-phase2a-hungarian.md
 */

import { INFINITY_COST } from "./jointSolver.js";

const STAR = 1;
const PRIME = 2;

/**
 * Hungarian/Munkres на square cost matrix.
 *
 * Возвращает permutation [n] где result[row] = col минимизирующая
 * sum(cost[i][result[i]]).
 *
 * @param {number[][]} squareCost — n×n матрица finite cost
 * @returns {number[]}
 */
export function hungarianMatch(squareCost) {
  const n = squareCost.length;
  if (n === 0) return [];

  const cost = squareCost.map((row) => [...row]);

  // Step 1: row reduction
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
  // Safety guard на бесконечный цикл — реальные итерации << n³
  const maxIter = (n * n * n + 10) * 4;
  let iterCount = 0;

  while (iterCount++ < maxIter) {
    if (step === 4) {
      // Cover columns containing starred zeros
      for (let j = 0; j < n; j++) colCovered[j] = false;
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
      let r = -1, c = -1;
      for (let i = 0; i < n && r === -1; i++) {
        if (rowCovered[i]) continue;
        for (let j = 0; j < n && r === -1; j++) {
          if (!colCovered[j] && cost[i][j] === 0) { r = i; c = j; }
        }
      }
      if (r === -1) {
        step = 8;
      } else {
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
        } else {
          rowCovered[r] = true;
          colCovered[starCol] = false;
          // step остаётся 6
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

  if (iterCount >= maxIter) {
    throw new Error("hungarianMatch: max iterations exceeded — input may be malformed");
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

/**
 * Optimal bipartite assignment intents → slots через Hungarian.
 *
 * Drop-in replacement для greedyAssign. Same shape входа/выхода.
 * Гарантирует global optimum (минимум ∑ cost) против greedy local
 * optimum.
 *
 * Алгоритм:
 *   1. expandSlots → virtual single-capacity slots [size N]
 *   2. Padding до квадратной матрицы max(n, N) × max(n, N):
 *      - slack rows (i ≥ n) — cost 0 для всех колонок (slot unassigned)
 *      - slack cols (j ≥ N) — cost BIG (intent unassigned, witness)
 *      - INFINITY_COST → BIG (Hungarian не работает с Infinity)
 *   3. hungarianMatch → permutation
 *   4. Извлечь intent → physical slot mapping
 *
 * @param {ReturnType<typeof import("./jointSolver.js").buildCostMatrix>} matrix
 * @param {Record<string, { capacity: number, allowedRoles: string[] }>} slots
 * @returns {{
 *   assignment: Map<string, string>,
 *   unassigned: string[],
 *   witnesses: Array<{ basis: string, reliability: string, intentId: string, reason: string }>,
 * }}
 */
export function hungarianAssign(matrix, slots) {
  const { cost, intentIds, colIndex } = matrix;
  const n = intentIds.length;

  const expanded = expandSlots(slots);
  const N = expanded.length;
  const size = Math.max(n, N);

  if (size === 0) {
    return { assignment: new Map(), unassigned: [], witnesses: [] };
  }

  // BIG — большое финитное для замены INFINITY_COST.
  // Hungarian работает с finite numbers; BIG достаточно велик чтобы
  // никогда не быть выбранным если есть финитная альтернатива.
  const BIG = 1_000_000;

  const square = Array.from({ length: size }, () =>
    new Array(size).fill(0)
  );

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (i >= n) {
        // slack row — slot не получает intent (cost 0)
        square[i][j] = 0;
      } else if (j >= N) {
        // slack column — intent unassigned (cost BIG)
        square[i][j] = BIG;
      } else {
        const physName = expanded[j].physicalName;
        const physColIdx = colIndex.get(physName);
        const c = cost[i][physColIdx];
        square[i][j] = c >= INFINITY_COST ? BIG : c;
      }
    }
  }

  const assignment = hungarianMatch(square);

  const result = new Map();
  const unassigned = [];
  const witnesses = [];

  for (let i = 0; i < n; i++) {
    const j = assignment[i];
    const isSlackCol = j >= N;
    const isBigCell = !isSlackCol && square[i][j] >= BIG;

    if (isSlackCol || isBigCell) {
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
