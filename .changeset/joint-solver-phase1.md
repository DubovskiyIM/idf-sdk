---
"@intent-driven/core": minor
---

feat: joint solver Phase 1 — pure cost matrix + greedy assignment

Добавляет фундаментальные функции для будущей замены `assignToSlots*`:

- `classifyIntentRole(intent, mainEntity?)` → `string[]` — slot-роли по
  salience tier'ам (primary / secondary / navigation / utility) +
  destructive flag по `remove`-effect на `mainEntity` (orthogonal,
  multi-role).
- `buildCostMatrix({ intents, slots, mainEntity? })` →
  `{ cost, rowIndex, colIndex, slotNames, intentIds }` — строит
  `cost[i][s] = -salience(intent_i)` если slot принимает intent (по
  ролям), `INFINITY_COST` иначе.
- `greedyAssign(matrix, slots)` →
  `{ assignment, unassigned, witnesses }` — sort intents по min-cost,
  distribute с capacity respect. Unassigned → witness `basis:
  "ill-conditioned"` reliability `rule-based`.
- `INFINITY_COST` — `Number.POSITIVE_INFINITY` константа для
  декларативной проверки feasibility.

Phase 1 живёт **параллельно** с существующим `assignToSlots*` —
интеграция в `assignToSlotsCatalog/Detail` и Hungarian algorithm —
Phase 2 после parity tests. Calibration на 21 ручном решении из
`salience-suggestions.md` — Phase 3.

Tests: 27 unit + 4 property × 50-100 runs (1700 → 1727 core regression).

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2 (PR #366).
Plan: `docs/superpowers/plans/2026-04-26-joint-solver-phase1.md`.
