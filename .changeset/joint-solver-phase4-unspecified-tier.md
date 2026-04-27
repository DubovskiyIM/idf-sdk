---
"@intent-driven/core": minor
---

feat(core): joint solver Phase 4 — unspecified tier для unannotated intents (A2 slot-model calibration)

Phase 4 research показал что 100% divergent intents (476 cases) — это
unannotated intents (no explicit `intent.salience`). Default 40 →
navigation tier → fits во ВСЕ slots inclusive defaults → slot
declaration order dominated outcome (hero/primaryCTA первые → unannotated
intents auto-routed туда).

Top divergent slot pairs:
  overlay → toolbar:    169 (35.5%)
  overlay → hero:       107 (22.5%)
  toolbar → primaryCTA:  77 (16.2%)
  overlay → primaryCTA:  73 (15.3%)

Fix:

1. New tier 'unspecified' в classifyIntentRole для intents без
   author-explicit `intent.salience`.

2. Default slot models — primary placement slots (hero, primaryCTA)
   НЕ включают 'unspecified' в allowedRoles. Overflow slots (toolbar,
   overlay, footer) включают.

3. Bridge `computeAlternateAssignment` помечает enriched intent с
   `_salienceSource: "explicit" | "computed"`. classifyIntentRole
   распознаёт source — computed-only intents (heuristic из particles)
   считаются unspecified (overflow), не tier по value.

Validation:

| Metric           | Phase 3g peak | Phase 4   | Δ      |
|------------------|---------------|-----------|--------|
| Total intents    | 791           | 789       | -2     |
| Agreed           | 124           | 173       | +49    |
| Divergent        | 476           | 427       | -49    |
| Derived-only     | 12            | 12        | 0      |
| Alternate-only   | 179           | 177       | -2     |
| Agreement rate   | 15.7%         | **21.9%** | +6.2pp |

vs Phase 3a baseline: agreement 5.9% → 21.9% (3.7× boost).

A2 Phase trajectory:
  3a:    5.9% (873 dOnly, 470 div)
  3f:   14.3% (49, 459)
  3g:   15.7% (12, 476)  filter direction closed
  4:    21.9% (12, 427)  ← NEW PEAK, slot-model calibration

Tests:
  classifyIntentRole — updated 'без salience → unspecified'
  buildCostMatrix — updated 'без salience → INFINITY если slots не
                     include unspecified'
  jointSolverBridge — computed-only intent → overflow placement
  1888/1888 core regression green

Author migration:
  Authors могут сделать intents primary-eligible через annotation:
    intent.salience: 80  // primary tier
    intent.salience: 60  // secondary
    intent.salience: "primary"  // shorthand

  Default behaviour без annotation — overflow placement. Это
  conservative — author-explicit signal required для primary slots.

Backlog: idf-sdk § A2 Phase 4

Depends on: PR #414 (Phase 3g appliesToProjection)
