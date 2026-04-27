---
"@intent-driven/core": minor
---

fix(core): bridge — appliesToProjection symmetry с derived (A2 Phase 3g)

Phase 3g research выявил что bridge `computeAlternateAssignment` слишком
inclusive vs derived `assignToSlots*`. Alternate-only residue 530 cases
после Phase 3f closure — bridge видит intents которые derived НАМЕРЕННО
не показывает.

Cause: `accessibleIntents` only checks `intentTouchesEntity` +
`roleDef.canExecute`. Derived `assignToSlots*` дополнительно фильтрует
через `appliesToProjection` (creator-scoping, route-scope, effect-less
utility check, search witness check). Без matching этих rules bridge
non-symmetric с derived.

Fix: apply `appliesToProjection` после `accessibleIntents` в bridge.

Validation re-run на 17 доменах:

| Metric | Phase 3f | Final (audit) | Phase 3g |
|--------|----------|---------------|----------|
| Total intents | 859 | 1142 | 791 |
| Agreed | 123 | 131 | 124 |
| Divergent | 459 | 481 | 476 |
| Derived-only | 49 | 0 | 12 |
| Alternate-only | 228 | 530 | 179 |
| Agreement rate | 14.3% | 11.5% | **15.7%** |

**+1.4pp от Phase 3f peak** (14.3% → 15.7%).
**Alternate-only -66.2%** (530 → 179).

12 derivedOnly — minor trade-off; derived has paths bridge slightly missing
(edge cases в creator-of-mainEntity rule).

A2 Phase 3 calibration journey:
  3a baseline:  5.9% agreement, 873 derivedOnly, 231 alternate-only
  3f peak:     14.3%, 49, 228
  Final audit: 11.5%, 0, 530
  3g closure:  15.7%, 12, 179  ← NEW PEAK

Filter direction CLOSED (both derivedOnly + alternate-only contained).
Divergent 476 — slot-model territory (intents в обоих, разные slots).
Phase 4 для slot-model refinements (separate research direction).

Tests fixtures updated с adequate effects/creates для passing
appliesToProjection: 1887/1887 core regression green.

Backlog: idf-sdk § A2 Phase 3g

Depends on: PR #410 (bridge normalize)
