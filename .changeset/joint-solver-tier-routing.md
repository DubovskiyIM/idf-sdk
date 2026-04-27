---
"@intent-driven/core": minor
---

feat(crystallize_v2): tier-driven slot routing — opt-in promotion primary tier intents в hero/primaryCTA

Закрывает A2 author-audit structural divergence (idf #166): до этого
`assignToSlotsCatalog/Detail` не консультировало `classifyIntentRole` для
slot-routing решений. Salience влияла только на in-slot ordering
(`bySalienceDesc`), но не на выбор слота.

Включается через `ontology.features.salienceDrivenRouting: true`. При
включении:

- **Catalog**: creator-of-mainEntity intent с `intent.salience >= 80` (explicit
  primary tier) промотируется в `slots.hero` (если hero пустой и shape
  позволяет — не timeline/directory). Иначе legacy → toolbar.
- **Detail**: intent с `intent.salience >= 80` без parameters и без
  `irreversibility: "high"` промотируется в `slots.primaryCTA` (даже без
  phase-transition). Author override через `projection.toolbar` whitelist
  работает как раньше.

Default — opt-out (existing behavior). Default-flip — отдельный шаг (по
опыту Phase 3d.3 default-flip требует host-side audit и broad coordination).

10 новых тестов в `salienceDrivenRouting.test.js`.

См. `idf/docs/jointsolver-author-audit-findings-2026-04-27.md` для empirical
context (50 dormant annotations across 8 доменов готовы к активации этим
flag'ом).
