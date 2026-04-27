---
"@intent-driven/core": minor
---

fix(core): joint solver Phase 3f — crystallize-level pre-filter (canExec leak fix)

Phase 3e validation выявил **88.7% residue** (383 из 432) это
canExec-leak — intents проходят несмотря на opts.respectRoleCanExecute=true.

Root cause:
  Phase 3d.1 hook в assignToSlots* filter'ит INTENTS только для
  slot-assembly. НО Pattern Bank apply phase (applyStructuralPatterns)
  использует projIntents = filter(INTENTS, touches mainEntity), который
  строится из глобального INTENTS — не filtered. Patterns добавляли
  intents в slots **после** pre-filter.

Fix:
  Применить filterIntentsByRoleCanExecute на crystallize_v2-уровне
  сразу после INTENTS normalize (sortKeys + normalizeIntentsMap),
  ДО projIntents construction и assignToSlots* call. assignToSlots*
  hook остаётся как safety net + для прямого call.

Result (validation re-run, 17 доменов):

| Metric | 3e (before) | 3f (after) | Δ |
|--------|-------------|------------|---|
| Total intents | 1242 | 859 | -383 |
| Agreed | 122 | 123 | +1 |
| Divergent | 464 | 459 | -5 |
| Derived-only | 432 | 49 | **-383 (-88.7%)** |
| Agreement rate | 9.8% | **14.3%** | **+4.5pp** |

vs Phase 3a baseline: agreement 5.9% → 14.3% (**2.4× от baseline**).
derivedOnly 873 → 49 (**−94.4%**, -824 intents).

Residue 49:
  100% missing-entity-reference (author bugs — intent.particles не
  упоминает mainEntity ни через entities/creates/effects).
  Concentrated в: sales (16), notion (21), gravitino (8), messenger (3),
  automation (1).

Это author-tier residue — нет SDK fix, требует ontology corrections.

Tests:
  Core regression: 1887/1887 (no new tests — fix реактивно изолирует
  existing pre-filter с broader scope).

Phase 3 calibration loop **functionally complete**:
  3a (idf #151)    ✅ data
  3b (idf #153)    ✅ empirical model
  3c' (sdk #398)   ✅ apply
  3c'' (idf #155)  ✅ validation 5.9% → 7.1%
  3d (idf #156)    ✅ filter alignment decision
  3d.1+3d.2 (sdk #400) ✅ opt-in implementation
  pass-through (sdk #403) ✅ crystallizeV2 opts fix
  3e (idf #157)    ✅ validation 7.1% → 9.8%
  3f (этот PR)     ✅ crystallize pre-filter — 9.8% → 14.3%
  3d.3            ⏸ default flip (long-term major + sales audit)

Backlog: idf-sdk § A2 Phase 3f
Validation: idf docs Phase 3f re-run

Depends on: #400 (Phase 3d.1+3d.2) + #403 (pass-through fix)
