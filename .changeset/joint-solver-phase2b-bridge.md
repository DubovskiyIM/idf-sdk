---
"@intent-driven/core": minor
---

feat: joint solver Phase 2b — bridge module

Добавляет `computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts?)` —
bridge между existing `assignToSlots*` input format и jointSolver
pipeline. Same signature как assignToSlots*; diagnostic side-by-side
для будущей Phase 2c integration.

API:
- `getDefaultSlotsForArchetype(archetype)` — default slot models для
  catalog/detail/feed.
- `computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts?)`
  → `{ assignment, unassigned, witnesses, metadata }`
  - extracts intents через `accessibleIntents`
  - enriches с computed salience (если intent не имеет explicit)
  - applies default slots по `projection.archetype`
  - default solver: `hungarianAssign`; `opts.solver: "greedy"` → fallback
  - `metadata.basis: "joint-solver-alternative"` — diagnostic marker

opts:
- `role` — viewer role (default: `projection.forRoles[0]` или `"observer"`)
- `slots` — override default slot model
- `solver` — `"hungarian"` (default) | `"greedy"`

Phase 2c (интеграция в `assignToSlotsCatalog/Detail` через diagnostic
witness emit) и Phase 3 (calibration) — отдельные backlog items.

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
Plan: `docs/superpowers/plans/2026-04-27-joint-solver-phase2b-bridge.md`.
