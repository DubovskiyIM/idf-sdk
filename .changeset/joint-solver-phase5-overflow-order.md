---
"@intent-driven/core": minor
---

feat(core): joint solver Phase 5 — overflow slot order (A2 calibration NEW PEAK 42.7%)

Phase 5 finding: после Phase 4 (unspecified tier) 63% остающихся
divergences были `overlay → toolbar` — alternate выбирал toolbar
(первый overflow в declaration), derived semantic'ously overlay.

Hungarian solver use Object.keys(slots) order для tie-break при равных
costs. Для unspecified intents все overflow slots имеют cost -40.
Hungarian берёт первый valid — toolbar. Derived ставит в overlay по
empirical UX intuition (overlay = semantic overflow для secondary
actions).

Fix: reorder slot declaration — overlay BEFORE toolbar в catalog/detail/feed.
Hungarian теперь предпочитает overlay для unspecified intents.

Validation:

| Metric           | Phase 4 | Phase 5  | Δ       |
|------------------|---------|----------|---------|
| Total intents    | 789     | 789      | 0       |
| Agreed           | 173     | 337      | +164    |
| Divergent        | 427     | 263      | -164    |
| Derived-only     | 12      | 12       | 0       |
| Alternate-only   | 177     | 177      | 0       |
| Agreement rate   | 21.9%   | **42.7%**| +20.8pp |

vs Phase 3a baseline: agreement 5.9% → 42.7% (**7.2× boost**).

A2 trajectory:
  3a:    5.9%  (873 dOnly, 470 div)
  3f:   14.3%  (49, 459)
  3g:   15.7%  (12, 476)   filter direction closed
  4:    21.9%  (12, 427)   slot-model unspecified tier
  5:    42.7%  (12, 263)   ← NEW PEAK (7.2× от baseline)

Slot declaration order semantic:
  catalog: hero (primary) → overlay (overflow) → toolbar (also overflow)
  detail:  primaryCTA → overlay → toolbar → footer
  feed:    overlay → toolbar

Reorder rationale: overlay имеет capacity больше (9 catalog, 9 detail,
14 feed) и semantically used для secondary actions. Toolbar обычно
reserved для author-annotated primary actions (visible toolbar при
explicit `intent.salience` annotation).

Tests:
  jointSolverBridge — 11/11 (slot order assertions updated)
  Core regression: 1888/1888 green

Backlog: idf-sdk § A2 Phase 5

Depends on: PR #420 (Phase 4 unspecified tier)
