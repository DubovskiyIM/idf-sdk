---
"@intent-driven/core": minor
---

feat: joint solver Phase 2d — opt-in diagnostic в assignToSlots*

`assignToSlotsCatalog` и `assignToSlotsDetail` теперь поддерживают
opt-in `opts.diagnoseAlternate: true` — после построения slots
вызывают `diagnoseAssignment` (Phase 2c) и pushпушат witness
`joint-solver-alternative` в `opts.witnesses` если derived assignment
расходится с jointSolver Hungarian alternate.

Hooks (4 строки на файл, conservative):
```js
if (opts?.diagnoseAlternate && Array.isArray(opts.witnesses)) {
  const altWitness = diagnoseAssignment({
    INTENTS, projection, ONTOLOGY,
    derivedSlots: slots,
    role: opts.role,
    solver: opts.alternateSolver,
  });
  if (altWitness) opts.witnesses.push(altWitness);
}
```

opts:
- `diagnoseAlternate: boolean` (default false) — opt-in.
- `alternateSolver: "hungarian" | "greedy"` (default `"hungarian"`).

**Backward-compat:** default false → no behavior change. Existing 1800
tests passing без modifications.

Use case:
```js
const witnesses = [];
const slots = assignToSlotsDetail(INTENTS, projection, ONTOLOGY, strategy, {
  role: viewer,
  witnesses,                  // collector
  diagnoseAlternate: true,    // opt-in
});
// witnesses теперь содержит:
// - existing witnesses (alphabetical-fallback, declaration-order, IB)
// - joint-solver-alternative если есть divergence
//
// Studio показывает side-by-side derived vs alternate
// Phase 3 calibration на основе divergence patterns
```

С Phase 2d **A2 functionally closed**:
- Phase 1 (cost matrix + greedy) — MERGED
- Phase 2a (Hungarian) — OPEN
- Phase 2b (bridge) — OPEN
- Phase 2c (diagnostic helper) — OPEN
- Phase 2d (intrusive opt-in) — OPEN
- Phase 3 (calibration) — research/data-analysis sprint, отдельный track

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
