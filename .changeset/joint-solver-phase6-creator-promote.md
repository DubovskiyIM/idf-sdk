---
"@intent-driven/core": minor
---

feat(core): joint solver Phase 6 — creator-of-mainEntity auto-promote (A2 NEW PEAK 54.2%)

Phase 6 finding: после Phase 5 reorder 35.4% остающихся divergences
были `hero → overlay` для creator-intents. Author не аннотировал
`intent.salience` потому что `intent.creates === mainEntity` IS
declarative primary signal — equivalent to salience: 80.

Fix: classifyIntentRole auto-promote creator-of-mainEntity intents в
ROLE_PRIMARY tier даже без explicit intent.salience.

```js
const isCreatorOfMain =
  intent?.creates && mainEntity && intent.creates === mainEntity;
if (isCreatorOfMain) {
  roles.push(ROLE_PRIMARY);
} else {
  roles.push(ROLE_UNSPECIFIED);
}
```

Validation:

| Metric           | Phase 5 | Phase 6   | Δ        |
|------------------|---------|-----------|----------|
| Total intents    | 789     | 791       | +2       |
| Agreed           | 337     | 429       | +92      |
| Divergent        | 263     | 171       | -92      |
| Derived-only     | 12      | 12        | 0        |
| Alternate-only   | 177     | 179       | +2       |
| Agreement rate   | 42.7%   | **54.2%** | +11.5pp  |

vs Phase 3a baseline: agreement 5.9% → 54.2% = **9.2× boost**.

A2 trajectory:
  3a:   5.9% (873 dOnly, 470 div)
  3f:  14.3% (49, 459)         canExec leak
  3g:  15.7% (12, 476)         filter direction closed
  4:   21.9% (12, 427)         unspecified tier
  5:   42.7% (12, 263)         overflow order
  6:   54.2% (12, 171)         ← NEW PEAK creator auto-promote

Author migration:
  Authors не нуждаются в explicit annotation для creator intents:

  // Auto-promoted to primary (creates === mainEntity)
  { name: 'Create', creates: 'Listing', particles: { ... } }
  → tier: primary → primaryCTA / hero

  // Explicit primary (для не-creator intents)
  { name: 'Edit', salience: 80, particles: { ... } }
  → tier: primary

  // Default (overflow placement)
  { name: 'Filter', particles: { ... } }
  → tier: unspecified → toolbar / overlay / footer

Tests: 1888/1888 core regression green.

Backlog: idf-sdk § A2 Phase 6

Depends on: PR #422 (Phase 5 overflow order)
