---
"@intent-driven/core": minor
---

feat(core): joint solver Phase 7 — phase-transition auto-promote (A2 marginal +0.3pp)

Phase 7 finding: после Phase 6 (creator promote) ~80 detail divergences
`toolbar → overlay` для unannotated intents. Hypothesis was phase-
transition intents (replace mainEntity.status) — workflow-critical
actions semantically secondary tier.

Fix: classifyIntentRole auto-promote phase-transition intents
(intent.particles.effects: replace mainEntity.status) в SECONDARY tier.

Validation:

| Metric           | Phase 6 | Phase 7   | Δ        |
|------------------|---------|-----------|----------|
| Total intents    | 791     | 791       | 0        |
| Agreed           | 429     | 431       | +2       |
| Divergent        | 171     | 169       | -2       |
| Derived-only     | 12      | 12        | 0        |
| Alternate-only   | 179     | 179       | 0        |
| Agreement rate   | 54.2%   | **54.5%** | +0.3pp   |

Phase 7 reached diminishing returns — narrow phase-transition rule
закрыло только 2 cases. Broader "edit-main" rule (any replace на
mainEntity → secondary) был tried в development — оказался ambiguous
(closed одни pairs, открыл другие через primaryCTA secondary admit).
Narrow rule conservative, stable.

A2 trajectory complete:
  3a:   5.9%
  3f:  14.3%
  3g:  15.7%
  4:   21.9%
  5:   42.7%
  6:   54.2%
  7:   54.5%  ← diminishing returns ceiling

vs Phase 3a baseline:
  agreement 5.9% → 54.5% = 9.2× boost
  derivedOnly 873 → 12 = -98.6%
  divergent 470 → 169 = -64.0%

Tests: 1888/1888 core regression green.

A2 calibration loop functionally complete. Дальнейшие improvements
(>54.5% agreement) требуют per-domain calibration или author audit
(explicit intent.salience annotation на 169 divergent cases).

Backlog: idf-sdk § A2 Phase 7

Depends on: PR #424 (Phase 6 creator promote)
