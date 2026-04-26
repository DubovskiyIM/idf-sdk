---
"@intent-driven/core": minor
---

feat: joint solver Phase 2a — Hungarian algorithm (optimal assignment)

Добавляет `hungarianAssign(matrix, slots)` — drop-in replacement для
`greedyAssign` с гарантией global optimum через Munkres O(n³).

API:
- `hungarianMatch(squareCost) → number[]` — core algorithm на square
  cost matrix; возвращает permutation минимизирующую `∑ C[i][a[i]]`.
- `expandSlots(slots) → Array<{ virtualName, physicalName }>` —
  capacity > 1 → virtual single-capacity slot-slots.
- `hungarianAssign(matrix, slots) → { assignment, unassigned, witnesses }`
  — wrap'ит `hungarianMatch` с padding до квадратной матрицы для
  rectangular n × N случая. Same shape как `greedyAssign`.

Реализация:
- `INFINITY_COST` маппится в `BIG = 1_000_000` (Hungarian не работает с
  Infinity).
- Slack rows (i ≥ n) — cost 0 (slot не получает intent).
- Slack columns (j ≥ N) — cost BIG (intent unassigned, witness
  `ill-conditioned`).
- Safety guard на бесконечный цикл (не должен срабатывать на корректном
  input'е).

Property tests:
- Bijection invariant — `hungarianMatch` возвращает permutation.
- Optimality — `hungarianMatch == brute-force minimum` для n ≤ 4.
- `Hungarian total cost ≤ Greedy total cost` (50 runs).
- Capacity respect (50 runs).

Phase 2b (parity tests против real domains) и Phase 2c/2d (интеграция
в `assignToSlotsCatalog/Detail`) — отдельные backlog items.

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
Plan: `docs/superpowers/plans/2026-04-26-joint-solver-phase2a-hungarian.md`.
