---
"@intent-driven/core": minor
---

feat(core): explainCrystallize — unified witness query surface

Новая функция-query over artifact.witnesses[]. Принимает artifact и
возвращает структурированное объяснение его происхождения:

```js
explainCrystallize(artifact) → {
  projection: "listing_detail",
  archetype: "detail",
  origin: "derived+enriched",  // или "derived" | "authored" | "authored+enriched"
  witnessesByBasis: {
    "crystallize-rule": [...R1, R3, R4, R6, ...],
    "pattern-bank": [...],
    "polymorphic-variant": [...],
    "temporal-section": [...],
  },
  ruleIds: ["R3", "R4", "R6"],
  patternIds: ["subcollections", "grid-card-layout"],
  trace: [
    { step: 1, basis: "crystallize-rule", ruleId: "R3", rationale: "..." },
    { step: 2, basis: "crystallize-rule", ruleId: "R6", rationale: "..." },
    ...
  ],
  summary: 'detail "listing_detail" · выведена + обогащена · правила: R3, R4, R6 · паттерны: subcollections',
}
```

Также экспортируется `explainAllCrystallize(artifacts)` — batch-вариант
над `Record<projId, artifact>`.

**Назначение**: единый consumer witness'ов из всех basis (crystallize-rule,
pattern-bank, polymorphic-variant, temporal-section, alphabetical-fallback,
authored). Главные callers — CrystallizeInspector в §27 Studio, spec-debt
dashboards, near-miss analyzers.

**Origin classification**:
- `derived` — только origin-правила (R1/R1b/R2/R3/R7/R10).
- `derived+enriched` — origin + enrichment-правила (R4/R6/R9).
- `authored+enriched` — authored проекция, обогащённая R9/R4/R6.
- `authored` — ни одного crystallize-rule witness.

Trace упорядочен по BASIS_ORDER (crystallize-rule → polymorphic → temporal →
pattern-bank → alphabetical-fallback → authored), внутри basis — в порядке
чтения artifact.witnesses[].

Спецификация: `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`
(секция explainCrystallize).

Тесты: +8 в `explainCrystallize.test.js` (derived origin, authored-only,
derived+enriched, trace order, patternIds, invalid input, batch,
summary content). 657/657 зелёные.
