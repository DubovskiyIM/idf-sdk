---
"@intent-driven/core": minor
---

fix(core): crystallizeV2 пробрасывает user opts в assignToSlots* (A2 follow-up)

`crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY, domainId, opts)` теперь
пробрасывает следующие user opts в `assignToSlots*`:

- `opts.role` — viewer role (для IB filter, role-canExecute checks)
- `opts.witnesses` — collector array
- `opts.respectRoleCanExecute` — Phase 3d.1 opt-in pre-filter
- `opts.diagnoseAlternate` — Phase 2d joint-solver-alternative witness
- `opts.alternateSolver` — `"hungarian" | "greedy"` для diagnostic

Проблема:
До этого fix `crystallizeV2` вызывал `assignToSlots(...)` с literal opts
`{ projections: allProjections }`, игнорируя user-provided opts. Это
делало все Phase 2d/3d opt-in features (joint-solver-alternative
witness, role-canExecute-violation witness, pre-filter) **достижимыми
только через прямой call `assignToSlots*`** — не через стандартный
crystallizeV2 pipeline.

Phase 3e validation re-run выявил это — agreement rate не вырос с 7.0%
после активации `respectRoleCanExecute: true` через crystallizeV2,
потому что opts не пробрасывался.

Fix: добавлен explicit pass-through на двух call-sites:
- primary `assignToSlots(...)` в crystallize_v2/index.js:192
- multi-view `assignToSlots(...)` в crystallize_v2/index.js:414

Tests:
  crystallizeV2.optsPassthrough.test.js — 5/5
    - default backward-compat
    - role + witnesses → violations emitted
    - respectRoleCanExecute → pre-filter
    - diagnoseAlternate → joint-solver-alternative witness
    - catalog archetype pass-through

  Core regression: 1887/1887 (Phase 3d.1+3d.2 baseline 1882 + 5 new)

Backward-compat: default opts (без role/respectRoleCanExecute/etc) →
no behavior change. Existing callers (sales, etc) не затронуты.

После merge:
  - Phase 3e validation re-run должен показать ожидаемый agreement
    rate convergence (~30-40%) когда `respectRoleCanExecute: true`
    активирован через crystallizeV2.
  - Studio author surface для всех 3 violation witnesses (alphabetical-
    fallback, role-canExecute-violation, joint-solver-alternative)
    работает в standard pipeline.

Backlog: idf-sdk § A2 (follow-up to Phase 3d).
Validation: idf docs Phase 3e re-run.
