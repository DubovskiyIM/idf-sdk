---
"@intent-driven/core": minor
---

feat: joint solver Phase 3d.1+3d.2 — respectRoleCanExecute opt-in + witness emission

Phase 3d filter alignment research (idf #156) показало, что **89.3%
derivedOnly mismatches** между existing `assignToSlots*` и
`computeAlternateAssignment` — это `role-canExecute-restriction`.
Existing `assignToSlots*` показывает CTA-кнопки даже если active role
не имеет intent в `ONTOLOGY.roles[role].canExecute` whitelist.
**Show-but-fail UX anti-pattern + security gap** в 11 из 17 доменов
(sales 593 случаев, notion 94, и т.д.).

Phase 3d.1+3d.2 closes structural gap через **opt-in migration**:

API:

- `filterIntentsByRoleCanExecute(INTENTS, role, ONTOLOGY)` — фильтрует
  INTENTS через `role.canExecute` (если defined) + `intent.permittedFor`
  (secondary check). Если role/canExecute не определены — INTENTS as-is.

- `detectCanExecuteViolations(INTENTS, role, ONTOLOGY)` —
  `Array<{ intentId, reason: "canExecute" | "permittedFor" | "both" }>`
  для witness emission.

- `buildCanExecuteViolationWitness({...})` — формирует witness
  `basis: "role-canExecute-violation"` reliability `rule-based`.

`assignToSlotsCatalog/Detail` opts:

- `opts.respectRoleCanExecute: boolean` (default **false** — backward-compat)
  - `true`: pre-filter intents через canExecute + permittedFor
  - `false` + `opts.witnesses`: emit `role-canExecute-violation`
    witnesses для author surface
- `opts.role: string` — viewer role (используется обоими modes)

Use case (Studio author surface):

```js
const witnesses = [];
const slots = assignToSlotsDetail(INTENTS, projection, ONTOLOGY, strategy, {
  role: viewer,
  witnesses,                     // collector — existing
  // respectRoleCanExecute: true  // opt-in активирует pre-filter
});

// witnesses теперь содержит:
// - existing (alphabetical-fallback, IB, etc)
// - new: role-canExecute-violation per "show-but-fail" intent
//   author видит в Studio: "эти intents показываются, но role не может execute"
```

Phasing:

- ✅ **3d.1** (этот PR): opt-in flag в assignToSlots*
- ✅ **3d.2** (этот PR): witness emission в default off mode
- ⏸ **3d.3** (long-term major): default flip `true`
  - Per-domain migration: либо дополнить `role.canExecute`,
    либо принять removal show-but-fail intents
  - Sales: 593 потенциальных removals — нужен audit

Validation после merge:
  Re-run `idf/scripts/jointsolver-divergence-collect.mjs` с
  `respectRoleCanExecute: true`. Expected: derivedOnly 873 → ~30,
  agreement rate 7.1% → ~30-40%.

С Phase 3d.1/3d.2 **A2 functionally complete**:
  Phase 1 (cost matrix + greedy)        — MERGED #370
  Phase 2a (Hungarian)                  — MERGED #376
  Phase 2b (bridge)                     — MERGED #378
  Phase 2c (diagnostic helper)          — MERGED #384
  Phase 2d (intrusive opt-in)           — MERGED #395
  Phase 3a (data collection)            — idf #151
  Phase 3b (empirical model)            — idf #153
  Phase 3c' (apply empirical в SDK)     — #398
  Phase 3c'' (validation re-run)        — idf #155
  Phase 3d research (decision)          — idf #156
  Phase 3d.1+3d.2 (этот PR)             — opt-in pre-filter + witness
  Phase 3d.3 (default flip)             — long-term major

Tests:
  respectRoleCanExecute.test.js — 13/13 (filter / detect / witness build)
  respectRoleCanExecute.integration.test.js — 8/8 (assignToSlots* hooks)
  Core regression: 1882/1882

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
Decision: `idf/docs/jointsolver-filter-alignment-decision-2026-04-27.md`.
