---
"@intent-driven/core": minor
---

feat(core): joint solver Phase 3d.3 — respectRoleCanExecute default flip

**BREAKING DEFAULT BEHAVIOR**: `opts.respectRoleCanExecute` теперь
defaults to `true`. До этого default был `false` (Phase 3d.1
backward-compat). Sales 593 audit (idf docs/sales-canexec-audit-2026-04-27.md)
показал что 47.2% derivedOnly intents — show-but-fail UX bugs;
50.6% — intentional cross-role missing canExecute. После audit
(50.6% added to canExec lists) и default flip — все sales violations
auto-resolved.

Migration:

```js
// Было (Phase 3d.1) — show всем role'ам, opt-in для filtering
crystallizeV2(intents, projections, ontology, "domain", {
  role: viewer,
  // respectRoleCanExecute не задан — default false → no filtering
});

// Стало (Phase 3d.3) — filter по умолчанию, opt-out для legacy
crystallizeV2(intents, projections, ontology, "domain", {
  role: viewer,
  // default true → filter по role.canExecute
});

// Legacy opt-out (для intentional show-but-fail UI или migration)
crystallizeV2(intents, projections, ontology, "domain", {
  role: viewer,
  respectRoleCanExecute: false,  // explicit opt-out
});
```

Apply на двух уровнях:
- crystallize_v2/index.js (top-level filter)
- assignToSlots* hooks (safety net)

Tests: 1888/1888 core regression green. Test fixtures для witness
emission updated с explicit `respectRoleCanExecute: false` opt-out.

A2 Phase 3d.3 closure:
  ✅ Sales 593 audit completed (idf docs)
  ✅ Sales canExec lists expanded (idf PR)
  ✅ Default flip (этот PR)

Author work для других доменов (если нужно): add intentional intents
to roles[*].canExecute. Default behaviour теперь conservative —
intents показываются только тем role'ам, что декларированы в
canExecute.

Backlog: idf-sdk § A2 Phase 3d.3 (closes major version transition)

Depends on: PR #427 (Phase 7)
