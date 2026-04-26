---
"@intent-driven/core": minor
---

feat: joint solver Phase 2c — diagnostic helper

Standalone helper для side-by-side сравнения existing `assignToSlots*`
output с jointSolver alternate. **НЕ модифицирует** assignToSlots* —
caller (host или crystallizeV2) сам решает звать `diagnoseAssignment`.

API:
- `extractDerivedAssignment(slots) → Map<intentId, slotName>` — сканирует
  slots-структуру existing assignToSlots*, извлекает intent → slot
  mapping. Nodes без `intentId` (text, gatingPanel, dataGrid) пропуска-
  ются. Дубликат intent — первое появление wins.
- `diagnoseAssignment({ INTENTS, projection, ONTOLOGY, derivedSlots,
  role?, slots?, solver? }) → Witness | null` — сравнивает derived и
  alternate (через `computeAlternateAssignment`), возвращает witness
  `joint-solver-alternative` с diff'ом и summary, или `null` если
  полное соответствие.

Witness shape:
```
{
  basis: "joint-solver-alternative",
  reliability: "rule-based",
  archetype, role, solver,
  diff: [
    { intentId, derived, alternate, kind: "divergent" | "derived-only" | "alternate-only" }
  ],
  summary: { total, divergent, derivedOnly, alternateOnly, agreed },
}
```

Use case (Phase 2c roadmap):
- Studio показывает side-by-side derived vs alternate для author review.
- Author видит intents где Hungarian рекомендует другой slot.
- На основе этого calibration весов (Phase 3) или manual override.

Phase 2d (intrusive integration внутри `assignToSlots*` через witness
emit) и Phase 3 (calibration) — отдельные backlog items.

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
Plan: `docs/superpowers/plans/2026-04-27-joint-solver-phase2c-diagnostic.md`.
