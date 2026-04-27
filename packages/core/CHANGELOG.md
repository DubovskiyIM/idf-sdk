# Changelog

## 0.105.0

### Minor Changes

- 9200066: feat(crystallize_v2): tier-driven slot routing — opt-in promotion primary tier intents в hero/primaryCTA

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

## 0.104.0

### Minor Changes

- fe0192c: patterns: promote `anchored-inline-comment-thread` candidate → stable (idf §13.17 first real promote).

  Comment sub-entity с FK на mainEntity, имеющий `anchorRange` field и `resolved` boolean — рендерится в **двух band'ах**: anchored thread (highlight + side-rail bubble) и unanchored aggregate (footer-секция «Page comments»).

  **Apply** (semantic, не marker-only): detect Comment-like entity через `findCommentLikeEntity(ontology, mainEntity)`, эмиттит 2 overlay entries с stable keys (`inline-comment-anchored__<entity>` и `inline-comment-unanchored__<entity>`), source markers, idempotent.

  **Trigger**: matches Page-like entity с Comment FK + `anchorRange` (или `anchor`/`anchorPath`/`rangeRef`/`selectionRef`) + `resolved: boolean`.

  **Source**: 4 product evidence (Confluence inline-comments, Google Docs side-rail, Notion inline thread, Figma comment-pins). Counterexample: Messenger flat threads.

  **Falsification**: shouldMatch confluence/page_detail; shouldNotMatch messenger/sales/delivery (нет anchor).

  **Stable pattern count: 44 → 45.**

  Это первый real candidate→stable promote сделанный через **idf-on-idf мета-домен** workflow:

  1. researcher эмиттит candidate JSON
  2. triage scoring + apply-synthesizer (marker-only) — host §13.17 opt-c
  3. semantic apply вручную написан (этот PR — opt-a manual demo)
  4. promotion intent в meta-домене → /api/document/meta/promotion_queue
  5. ship_pattern_promotion с этим SDK PR URL → меняет status в Φ → meta-compile patches `pattern-bank/PROMOTIONS.md`

  Closes idf §13.17 на одном паттерне (proof-of-concept).

  12 новых tests, 1930/1930 passed.

## 0.103.0

### Minor Changes

- be5fa8c: feat(core): joint solver Phase 3d.3 — respectRoleCanExecute default flip

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
    respectRoleCanExecute: false, // explicit opt-out
  });
  ```

  Apply на двух уровнях:

  - crystallize_v2/index.js (top-level filter)
  - assignToSlots\* hooks (safety net)

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

## 0.102.0

### Minor Changes

- b63ea65: feat(core): joint solver Phase 7 — phase-transition auto-promote (A2 marginal +0.3pp)

  Phase 7 finding: после Phase 6 (creator promote) ~80 detail divergences
  `toolbar → overlay` для unannotated intents. Hypothesis was phase-
  transition intents (replace mainEntity.status) — workflow-critical
  actions semantically secondary tier.

  Fix: classifyIntentRole auto-promote phase-transition intents
  (intent.particles.effects: replace mainEntity.status) в SECONDARY tier.

  Validation:

  | Metric         | Phase 6 | Phase 7   | Δ      |
  | -------------- | ------- | --------- | ------ |
  | Total intents  | 791     | 791       | 0      |
  | Agreed         | 429     | 431       | +2     |
  | Divergent      | 171     | 169       | -2     |
  | Derived-only   | 12      | 12        | 0      |
  | Alternate-only | 179     | 179       | 0      |
  | Agreement rate | 54.2%   | **54.5%** | +0.3pp |

  Phase 7 reached diminishing returns — narrow phase-transition rule
  закрыло только 2 cases. Broader "edit-main" rule (any replace на
  mainEntity → secondary) был tried в development — оказался ambiguous
  (closed одни pairs, открыл другие через primaryCTA secondary admit).
  Narrow rule conservative, stable.

  A2 trajectory complete:
  3a: 5.9%
  3f: 14.3%
  3g: 15.7%
  4: 21.9%
  5: 42.7%
  6: 54.2%
  7: 54.5% ← diminishing returns ceiling

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

## 0.101.1

### Patch Changes

- 9c3abc9: fix: re-export `patternKey` API из root `@intent-driven/core` (follow-up to #418).

  PR #418 добавил `patternKey` / `isSameLogicalPattern` / `findPatternByKey` / `parsePatternKey` / `logicalId` в `packages/core/src/patterns/index.js`, но забыл re-export'нуть из root `packages/core/src/index.js`. В результате `import { patternKey } from "@intent-driven/core"` падал с `patternKey is not a function`.

  Теперь все 5 helpers доступны через canonical root import.

  Found via: host meta-domain seed migration на patternKey API → TypeError при первом use.

## 0.101.0

### Minor Changes

- 77debdc: feat(core): joint solver Phase 6 — creator-of-mainEntity auto-promote (A2 NEW PEAK 54.2%)

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

  | Metric         | Phase 5 | Phase 6   | Δ       |
  | -------------- | ------- | --------- | ------- |
  | Total intents  | 789     | 791       | +2      |
  | Agreed         | 337     | 429       | +92     |
  | Divergent      | 263     | 171       | -92     |
  | Derived-only   | 12      | 12        | 0       |
  | Alternate-only | 177     | 179       | +2      |
  | Agreement rate | 42.7%   | **54.2%** | +11.5pp |

  vs Phase 3a baseline: agreement 5.9% → 54.2% = **9.2× boost**.

  A2 trajectory:
  3a: 5.9% (873 dOnly, 470 div)
  3f: 14.3% (49, 459) canExec leak
  3g: 15.7% (12, 476) filter direction closed
  4: 21.9% (12, 427) unspecified tier
  5: 42.7% (12, 263) overflow order
  6: 54.2% (12, 171) ← NEW PEAK creator auto-promote

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

## 0.100.0

### Minor Changes

- 301cb6b: feat(core): joint solver Phase 5 — overflow slot order (A2 calibration NEW PEAK 42.7%)

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

  | Metric         | Phase 4 | Phase 5   | Δ       |
  | -------------- | ------- | --------- | ------- |
  | Total intents  | 789     | 789       | 0       |
  | Agreed         | 173     | 337       | +164    |
  | Divergent      | 427     | 263       | -164    |
  | Derived-only   | 12      | 12        | 0       |
  | Alternate-only | 177     | 177       | 0       |
  | Agreement rate | 21.9%   | **42.7%** | +20.8pp |

  vs Phase 3a baseline: agreement 5.9% → 42.7% (**7.2× boost**).

  A2 trajectory:
  3a: 5.9% (873 dOnly, 470 div)
  3f: 14.3% (49, 459)
  3g: 15.7% (12, 476) filter direction closed
  4: 21.9% (12, 427) slot-model unspecified tier
  5: 42.7% (12, 263) ← NEW PEAK (7.2× от baseline)

  Slot declaration order semantic:
  catalog: hero (primary) → overlay (overflow) → toolbar (also overflow)
  detail: primaryCTA → overlay → toolbar → footer
  feed: overlay → toolbar

  Reorder rationale: overlay имеет capacity больше (9 catalog, 9 detail,
  14 feed) и semantically used для secondary actions. Toolbar обычно
  reserved для author-annotated primary actions (visible toolbar при
  explicit `intent.salience` annotation).

  Tests:
  jointSolverBridge — 11/11 (slot order assertions updated)
  Core regression: 1888/1888 green

  Backlog: idf-sdk § A2 Phase 5

  Depends on: PR #420 (Phase 4 unspecified tier)

## 0.99.0

### Minor Changes

- c1193cf: feat(core): joint solver Phase 4 — unspecified tier для unannotated intents (A2 slot-model calibration)

  Phase 4 research показал что 100% divergent intents (476 cases) — это
  unannotated intents (no explicit `intent.salience`). Default 40 →
  navigation tier → fits во ВСЕ slots inclusive defaults → slot
  declaration order dominated outcome (hero/primaryCTA первые → unannotated
  intents auto-routed туда).

  Top divergent slot pairs:
  overlay → toolbar: 169 (35.5%)
  overlay → hero: 107 (22.5%)
  toolbar → primaryCTA: 77 (16.2%)
  overlay → primaryCTA: 73 (15.3%)

  Fix:

  1. New tier 'unspecified' в classifyIntentRole для intents без
     author-explicit `intent.salience`.

  2. Default slot models — primary placement slots (hero, primaryCTA)
     НЕ включают 'unspecified' в allowedRoles. Overflow slots (toolbar,
     overlay, footer) включают.

  3. Bridge `computeAlternateAssignment` помечает enriched intent с
     `_salienceSource: "explicit" | "computed"`. classifyIntentRole
     распознаёт source — computed-only intents (heuristic из particles)
     считаются unspecified (overflow), не tier по value.

  Validation:

  | Metric         | Phase 3g peak | Phase 4   | Δ      |
  | -------------- | ------------- | --------- | ------ |
  | Total intents  | 791           | 789       | -2     |
  | Agreed         | 124           | 173       | +49    |
  | Divergent      | 476           | 427       | -49    |
  | Derived-only   | 12            | 12        | 0      |
  | Alternate-only | 179           | 177       | -2     |
  | Agreement rate | 15.7%         | **21.9%** | +6.2pp |

  vs Phase 3a baseline: agreement 5.9% → 21.9% (3.7× boost).

  A2 Phase trajectory:
  3a: 5.9% (873 dOnly, 470 div)
  3f: 14.3% (49, 459)
  3g: 15.7% (12, 476) filter direction closed
  4: 21.9% (12, 427) ← NEW PEAK, slot-model calibration

  Tests:
  classifyIntentRole — updated 'без salience → unspecified'
  buildCostMatrix — updated 'без salience → INFINITY если slots не
  include unspecified'
  jointSolverBridge — computed-only intent → overflow placement
  1888/1888 core regression green

  Author migration:
  Authors могут сделать intents primary-eligible через annotation:
  intent.salience: 80 // primary tier
  intent.salience: 60 // secondary
  intent.salience: "primary" // shorthand

  Default behaviour без annotation — overflow placement. Это
  conservative — author-explicit signal required для primary slots.

  Backlog: idf-sdk § A2 Phase 4

  Depends on: PR #414 (Phase 3g appliesToProjection)

## 0.98.0

### Minor Changes

- f56a318: patterns: composite-key API для глобально уникальной идентификации паттернов между bank'ами (closes idf backlog §13.1).

  Один и тот же паттерн может одновременно быть в `stable/<arch>/<id>.js` и в `candidate/<source>-<id>.json` (как «новое наблюдение в другом продукте»). Plain `id`-lookup ломал FK collisions в Φ при кросс-bank-операциях (mета-домен, promote-flow).

  Новые helpers:

  - `patternKey(p)` → composite ключ: `stable__<id>` / `candidate__<id>__<source?>` / `anti__<id>`
  - `isSameLogicalPattern(a, b)` — true если same logical-id, независимо от bank
  - `findPatternByKey(patterns, key)` — collection lookup по composite-ключу
  - `parsePatternKey(key)` → `{status, id, sourceProduct}` (round-trip с patternKey)
  - `logicalId(p)` — bare id без status/source prefix

  Backward-compat: `pattern.id` остаётся unchanged. patternKey — opcional layer поверх. Существующий код не ломается.

  Prerequisite для §13.17 (apply-derivation gap) на масштабе: каждый promoted candidate теперь имеет formal globally-unique key.

## 0.97.1

### Patch Changes

- 4d4e76e: fix(patterns): subcollections pattern уважает `absorbExclude` + `slots.subCollections` (§13d ext)

  Notion field-test (2026-04-27) обнажил gap в §13d: после bump'а core@0.94 (с `absorbExclude` на R8 hub-absorption), Block всё равно появлялся в `page_detail.slots.sections` — но через **`subcollections` pattern**, не R8. Pattern auto-derive'ил все FK-children mainEntity без проверки author opt-out, давая то же двойное представление UI: блоки в body + «BLOCK (12)» subсекция.

  Также автор Notion положил curated subCollections в **`slots.subCollections`** (nested), но pattern проверял только top-level `projection.subCollections` — author-curation gate не срабатывал.

  ## Fix

  `packages/core/src/patterns/stable/detail/subcollections.js`:

  1. Author-curation gate расширен — проверяется и `projection.subCollections` (top-level), и `projection.slots?.subCollections` (nested form, used by notion).
  2. `projection.absorbExclude: ["EntityName", ...]` теперь honored — entity'и пропускаются в `findSubEntities` filter, идентично R8 (один сигнал управляет обоими механизмами).

  ## Behaviour matrix

  | Author signal                                     | Pattern behaviour                                     |
  | ------------------------------------------------- | ----------------------------------------------------- |
  | `projection.subCollections: [...]` (top-level)    | no-op (existing behaviour)                            |
  | `projection.slots.subCollections: [...]` (nested) | **no-op** (новая ветка)                               |
  | `projection.absorbExclude: ["Block"]`             | Block пропускается, остальные FK-children auto-derive |
  | ничего                                            | full auto-derive (existing baseline)                  |

  ## Тесты

  5 новых в `subcollections.test.js`:

  - nested `slots.subCollections` — pattern no-op
  - `absorbExclude: ["Block"]` — фильтрует Block
  - multiple exclude (`["Block","Comment"]`)
  - `absorbExclude: []` — baseline
  - non-array `absorbExclude` — silently ignored

  Полный core: **1896/1896 passing**.

  ## Notion-host

  После релиза core@~0.96: notion `page_detail.absorbExclude: ["Block"]` (уже на месте) теперь полностью убирает Block subсекцию — блоки только в body через canvas.

## 0.97.0

### Minor Changes

- c6a3a3c: fix(core): bridge — appliesToProjection symmetry с derived (A2 Phase 3g)

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

  | Metric         | Phase 3f | Final (audit) | Phase 3g  |
  | -------------- | -------- | ------------- | --------- |
  | Total intents  | 859      | 1142          | 791       |
  | Agreed         | 123      | 131           | 124       |
  | Divergent      | 459      | 481           | 476       |
  | Derived-only   | 49       | 0             | 12        |
  | Alternate-only | 228      | 530           | 179       |
  | Agreement rate | 14.3%    | 11.5%         | **15.7%** |

  **+1.4pp от Phase 3f peak** (14.3% → 15.7%).
  **Alternate-only -66.2%** (530 → 179).

  12 derivedOnly — minor trade-off; derived has paths bridge slightly missing
  (edge cases в creator-of-mainEntity rule).

  A2 Phase 3 calibration journey:
  3a baseline: 5.9% agreement, 873 derivedOnly, 231 alternate-only
  3f peak: 14.3%, 49, 228
  Final audit: 11.5%, 0, 530
  3g closure: 15.7%, 12, 179 ← NEW PEAK

  Filter direction CLOSED (both derivedOnly + alternate-only contained).
  Divergent 476 — slot-model territory (intents в обоих, разные slots).
  Phase 4 для slot-model refinements (separate research direction).

  Tests fixtures updated с adequate effects/creates для passing
  appliesToProjection: 1887/1887 core regression green.

  Backlog: idf-sdk § A2 Phase 3g

  Depends on: PR #410 (bridge normalize)

## 0.96.0

### Minor Changes

- 051775b: fix(core): computeAlternateAssignment — нормализовать INTENTS перед accessibleIntents (A2 Phase 3 closure)

  Bridge `computeAlternateAssignment` принимает raw INTENTS из caller, но
  `accessibleIntents` читает `particles.entities` / `particles.effects`.
  Object-format intents (notion, gravitino, automation использует top-level
  α/target вместо `particles.effects`) — particles.entities появляется
  только после normalize.

  В результате до fix bridge не видел 30 intents в этих доменах
  (notion 21, gravitino 8, automation 1) — они флагились как author-bug
  `missing-entity-reference`.

  Fix: `normalizeIntentsMap(INTENTS)` перед `accessibleIntents` в bridge.
  crystallize_v2 нормализует на входе; bridge — caller-direct entry —
  должен делать то же. Idempotent: уже-normalized passes как no-op.

  Validation после fix (idf re-run на 17 доменах):
  derivedOnly: 49 → 0 (-100%, все 49 cases закрыты)
  Total intents: 859 → 1142 (alternate теперь видит правильно
  normalized intents)
  Agreement: 14.3% → 11.5% (lower из-за wider total; в abs terms
  agreed 123 → 131)

  Companion: idf PR — author fixes для sales/messenger где raw intents
  имели explicit `entities: []` (16+3=19 cases).

  A2 Phase 3 calibration journey final state:
  Phase 3a: 5.9% agreement, 873 derivedOnly
  Phase 3f: 14.3%, 49 derivedOnly (canExec leak closed)
  Final: 11.5%, 0 derivedOnly (all author bugs closed)

  derivedOnly direction CLOSED.
  Alternate-only direction (530 cases) — новый research axis.

  Tests: 1887/1887 core regression green.

## 0.95.0

### Minor Changes

- 5bb9d96: fix(core): joint solver Phase 3f — crystallize-level pre-filter (canExec leak fix)

  Phase 3e validation выявил **88.7% residue** (383 из 432) это
  canExec-leak — intents проходят несмотря на opts.respectRoleCanExecute=true.

  Root cause:
  Phase 3d.1 hook в assignToSlots\* filter'ит INTENTS только для
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

  | Metric         | 3e (before) | 3f (after) | Δ                 |
  | -------------- | ----------- | ---------- | ----------------- |
  | Total intents  | 1242        | 859        | -383              |
  | Agreed         | 122         | 123        | +1                |
  | Divergent      | 464         | 459        | -5                |
  | Derived-only   | 432         | 49         | **-383 (-88.7%)** |
  | Agreement rate | 9.8%        | **14.3%**  | **+4.5pp**        |

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
  3a (idf #151) ✅ data
  3b (idf #153) ✅ empirical model
  3c' (sdk #398) ✅ apply
  3c'' (idf #155) ✅ validation 5.9% → 7.1%
  3d (idf #156) ✅ filter alignment decision
  3d.1+3d.2 (sdk #400) ✅ opt-in implementation
  pass-through (sdk #403) ✅ crystallizeV2 opts fix
  3e (idf #157) ✅ validation 7.1% → 9.8%
  3f (этот PR) ✅ crystallize pre-filter — 9.8% → 14.3%
  3d.3 ⏸ default flip (long-term major + sales audit)

  Backlog: idf-sdk § A2 Phase 3f
  Validation: idf docs Phase 3f re-run

  Depends on: #400 (Phase 3d.1+3d.2) + #403 (pass-through fix)

## 0.94.0

### Minor Changes

- 9c587fa: fix(core): crystallizeV2 пробрасывает user opts в assignToSlots\* (A2 follow-up)

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
  crystallizeV2.optsPassthrough.test.js — 5/5 - default backward-compat - role + witnesses → violations emitted - respectRoleCanExecute → pre-filter - diagnoseAlternate → joint-solver-alternative witness - catalog archetype pass-through

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

## 0.93.0

### Minor Changes

- bdc9cd6: feat(crystallize): §13d — `parentProjection.absorbExclude` для R8 hub-absorption

  Notion field-test (2026-04-27) выявил false-positive R8 hub-absorption: `Block.pageId` ссылается на `Page`, R8 absorb'ил `block_list` как subCollection в `page_detail`. Но `Block` — это **content** страницы (рендерится в body через canvas/BlockEditor), не дочерний CRUD-каталог. В UI это давало двойное представление: блоки в body **и** «BLOCK (12)» subсекцию.

  ## Fix

  Author opt-out на parent projection:

  ```js
  page_detail: {
    kind: "detail",
    mainEntity: "Page",
    slots: { body: { kind: "canvas", canvasId: "block_canvas" } },
    absorbExclude: ["Block"],  // §13d — Block уже content в body
    subCollections: [
      { projectionId: "comments_thread", entity: "Comment", foreignKey: "pageId" },
      { projectionId: "page_permissions_panel", entity: "PagePermission", foreignKey: "pageId" },
    ],
  },
  ```

  R8 пропускает entities из `absorbExclude` при формировании candidates. Если после exclude оставшихся child'ов <2 (HUB_MIN_CHILDREN) — hub не формируется (graceful fallback на flat root catalogs).

  ## Backwards-compatibility

  - Existing R8 поведение для проекций без `absorbExclude` — без изменений
  - Legacy `childCatalog.absorbed: false` (per-projection override) продолжает работать
  - `absorbExclude` non-array (string / null / undefined) — silently ignored (forgiving API)

  ## Тесты

  4 новых в `crystallize_v2/absorbHubChildren.test.js`:

  - baseline без opt-out (Block/Comment/Permission absorbed)
  - `absorbExclude: ["Block"]` — Block остаётся root, остальные absorbed
  - `absorbExclude: ["Block","Comment"]` — только Permission, <MIN → no hub
  - non-array absorbExclude игнорируется

  Полный core: **1886/1886 passing** (было 1882/1882).

  ## Notion-host

  После релиза `core@~0.91` — добавить `absorbExclude: ["Block"]` на `notion.page_detail` (отдельный host PR). Subсекция «BLOCK (12)» исчезнет, content-блоки останутся только в canvas body.

## 0.92.0

### Minor Changes

- b95acd3: feat: joint solver Phase 3d.1+3d.2 — respectRoleCanExecute opt-in + witness emission

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
    witnesses, // collector — existing
    // respectRoleCanExecute: true  // opt-in активирует pre-filter
  });

  // witnesses теперь содержит:
  // - existing (alphabetical-fallback, IB, etc)
  // - new: role-canExecute-violation per "show-but-fail" intent
  //   author видит в Studio: "эти intents показываются, но role не может execute"
  ```

  Phasing:

  - ✅ **3d.1** (этот PR): opt-in flag в assignToSlots\*
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
  Phase 1 (cost matrix + greedy) — MERGED #370
  Phase 2a (Hungarian) — MERGED #376
  Phase 2b (bridge) — MERGED #378
  Phase 2c (diagnostic helper) — MERGED #384
  Phase 2d (intrusive opt-in) — MERGED #395
  Phase 3a (data collection) — idf #151
  Phase 3b (empirical model) — idf #153
  Phase 3c' (apply empirical в SDK) — #398
  Phase 3c'' (validation re-run) — idf #155
  Phase 3d research (decision) — idf #156
  Phase 3d.1+3d.2 (этот PR) — opt-in pre-filter + witness
  Phase 3d.3 (default flip) — long-term major

  Tests:
  respectRoleCanExecute.test.js — 13/13 (filter / detect / witness build)
  respectRoleCanExecute.integration.test.js — 8/8 (assignToSlots\* hooks)
  Core regression: 1882/1882

  Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
  Decision: `idf/docs/jointsolver-filter-alignment-decision-2026-04-27.md`.

## 0.91.0

### Minor Changes

- 75113c3: feat: joint solver Phase 3c' — empirical default slot models

  Replace упрощённой Phase 2b модели в `getDefaultSlotsForArchetype` на
  **empirical** model, извлечённую из existing `assignToSlots*` output на
  16 доменах (idf/scripts/jointsolver-empirical-slots.mjs, дата 2026-04-27).

  KEY CHANGES в `SLOTS_CATALOG/DETAIL/FEED`:

  catalog: hero+toolbar+context+fab → hero+toolbar+overlay
  Capacities: hero 1→2, toolbar 5, overlay 9 (NEW slot)
  context, fab — 0 observations → удалены

  detail: primaryCTA+secondary+toolbar+footer → primaryCTA+toolbar+overlay+footer
  Capacities: primaryCTA 3→10, toolbar 10→3, footer 3→35, overlay 9 (NEW)
  secondary — 0 observations → удалён

  feed: toolbar+context+fab → toolbar+overlay
  Capacities: toolbar 5, overlay 14 (NEW)
  context, fab — 0 observations → удалены

  KEY INSIGHT (Phase 3a measurements): `overlay → toolbar` был top
  divergence pattern (268/470 = 57% всех divergences). Добавление overlay
  slot закрывает это structurally.

  Slot order — declaration order служит stable tie-break для Hungarian
  solver (Object.keys order). Order semantic: primary-candidate slots
  first (hero/primaryCTA), затем toolbar, затем overflow (overlay/footer).

  allowedRoles — inclusive defaults (все salience tiers + destructive
  где empirically observed). Empirical observed roles были restrictive
  (99% intents без explicit salience → all = navigation tier);
  inclusive set accommodates explicit-salience annotations.

  Tests updated:
  jointSolverBridge.test.js — 11/11 (slot keys + capacities)
  Все остальные tests — passing без изменений (1861/1861 core green)

  Phase 3 validation pipeline:
  3a (idf #151): divergence dataset на 16 доменах — 5.9% agreement,
  470 divergent (28.1%), top pattern overlay → toolbar
  3b (idf #153): empirical model proposal
  3c' (этот PR): apply empirical в SDK
  3c'' (next): re-run divergence в host с empirical defaults — measure
  improvement (target: agreement 5.9% → 80%+)

  Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.

## 0.90.0

### Minor Changes

- deb12d5: feat: joint solver Phase 2d — opt-in diagnostic в assignToSlots\*

  `assignToSlotsCatalog` и `assignToSlotsDetail` теперь поддерживают
  opt-in `opts.diagnoseAlternate: true` — после построения slots
  вызывают `diagnoseAssignment` (Phase 2c) и pushпушат witness
  `joint-solver-alternative` в `opts.witnesses` если derived assignment
  расходится с jointSolver Hungarian alternate.

  Hooks (4 строки на файл, conservative):

  ```js
  if (opts?.diagnoseAlternate && Array.isArray(opts.witnesses)) {
    const altWitness = diagnoseAssignment({
      INTENTS,
      projection,
      ONTOLOGY,
      derivedSlots: slots,
      role: opts.role,
      solver: opts.alternateSolver,
    });
    if (altWitness) opts.witnesses.push(altWitness);
  }
  ```

  opts:

  - `diagnoseAlternate: boolean` (default false) — opt-in.
  - `alternateSolver: "hungarian" | "greedy"` (default `"hungarian"`).

  **Backward-compat:** default false → no behavior change. Existing 1800
  tests passing без modifications.

  Use case:

  ```js
  const witnesses = [];
  const slots = assignToSlotsDetail(INTENTS, projection, ONTOLOGY, strategy, {
    role: viewer,
    witnesses, // collector
    diagnoseAlternate: true, // opt-in
  });
  // witnesses теперь содержит:
  // - existing witnesses (alphabetical-fallback, declaration-order, IB)
  // - joint-solver-alternative если есть divergence
  //
  // Studio показывает side-by-side derived vs alternate
  // Phase 3 calibration на основе divergence patterns
  ```

  С Phase 2d **A2 functionally closed**:

  - Phase 1 (cost matrix + greedy) — MERGED
  - Phase 2a (Hungarian) — OPEN
  - Phase 2b (bridge) — OPEN
  - Phase 2c (diagnostic helper) — OPEN
  - Phase 2d (intrusive opt-in) — OPEN
  - Phase 3 (calibration) — research/data-analysis sprint, отдельный track

  Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.

## 0.89.0

### Minor Changes

- 3b99465: feat(crystallize): §13c — author `slots.body` passthrough в detail-архетипе

  Notion field-test (2026-04-27) выявил gap: автор объявляет `slots.body: { kind: "canvas", canvasId: "block_canvas" }` для page_detail, но `assignToSlotsDetail` игнорировал hint и derivил infoSection-column. В результате canvas-компонент (BlockEditor primitive через registerCanvas) вообще не рендерился — host видел auto-derived characteristics-секцию вместо своего content area.

  ## Что меняется

  `assignToSlotsDetail` теперь читает `projection.slots?.body` и нормализует его в финальный slot-node до auto-derive:

  | Author shape                                        | Output                                               |
  | --------------------------------------------------- | ---------------------------------------------------- |
  | `{ kind: "canvas", canvasId }`                      | `{ type: "canvas", canvasId }`                       |
  | `{ kind: "canvas" }` (без canvasId)                 | `{ type: "canvas", canvasId: null }` (host-fallback) |
  | `{ kind: "blockEditor", entity, parentField, ... }` | `{ type: "blockEditor", ... }`                       |
  | `{ kind: "dashboard", widgets }`                    | `{ type: "dashboard", widgets }`                     |
  | `{ type: "...", ... }` (already-typed)              | passthrough as-is                                    |
  | отсутствует / unknown kind                          | fallback на `buildDetailBody` auto-derive            |

  ## Backwards-compatibility

  - Existing detail-проекции без `slots.body` — без изменений (auto-derive прежний).
  - Unknown kind — silently fall back на auto-derive (не throw'аем, чтобы упрощать миграцию).
  - `slots.body` с типизированным `type` ключом — passthrough as-is (тестовые fixtures работают без regression).

  ## Тесты

  7 новых в `crystallize_v2/authoredBodyPassthrough.test.js`:

  - canvas с/без canvasId
  - blockEditor с props
  - dashboard с widgets
  - already-typed passthrough
  - backward-compat без authored body
  - unknown kind → fallback

  Полный core: **1848/1848 passing**.

  ## Notion-host

  После релиза `core@~0.86` notion `page_detail.slots.body: { kind: "canvas", canvasId: "block_canvas" }` будет работать declarativно. `BlockCanvas` (зарегистрированный через `registerCanvas("block_canvas", ...)`) рендерится как полноценный body, а не как сжатая subCollection.

## 0.88.1

### Patch Changes

- 6d1a7c4: fix(patterns): global-scope-picker apply должен push'ить node в array slots.header

  §13b (Notion field-test 2026-04-27): pattern apply возвращал `slots.header` object'ом со scopePicker key, тогда как `assignToSlots*` инициализирует `slots.header = []` (array). Это ломало `ArchetypeDetail.SlotRenderer items.map is not a function` на любой detail-проекции в домене с scope entity (Notion Workspace, Argo Project, Keycloak Realm).

  ## Fix

  `apply()` теперь:

  - Читает existing `Array.isArray(slots.header)` (fallback `[]`)
  - No-op если scopePicker уже присутствует — array node `{ type: "scopePicker" }` ИЛИ legacy object-form (backward-compat для уже-сохранённых artifact'ов)
  - Push'ит `{ type: "scopePicker", entity, label, source }` в array

  ## Backwards-compat

  Legacy authored override `slots.header = { scopePicker: {...} }` (object-form) — apply воспринимает как already-set, no-op. Renderer'ам, которые читают legacy form через `slots.header.scopePicker`, нужно переходить на iteration по array — но это рассматривается отдельно (нет известных потребителей кроме pattern apply само).

  ## Тесты

  Все 9 тестов в `global-scope-picker.test.js` обновлены на array shape:

  - helper `findScopePicker(header)` для ergonomics
  - новый case: legacy object-form → no-op (backward-compat)
  - existing-nodes preservation теперь проверяет array length вместо object spread

  Полный core: **1841/1841 passing**.

## 0.88.0

### Minor Changes

- f314200: feat(crystallize): §13 — `onItemClick: "projId"` string-shorthand auto-coerce

  Notion field-test (2026-04-27) выявил расхождение: автор писал shorthand `onItemClick: "page_detail"` (string), но `resolveNavigateAction` в renderer'е возвращал `null` без structured `{ action: "navigate", to, params }`. Клик на feed/catalog item молча игнорировался.

  ## Fix

  `crystallize_v2/index.js`: при `typeof proj.onItemClick === "string"` авто-coerce'им в:

  ```js
  {
    action: "navigate",
    to: "<projId>",
    params: { [targetProj.idParam || "id"]: "item.id" },
  }
  ```

  `idParam` берётся из target-проекции (если найдена в `allProjections`), иначе fallback на `"id"`. Параметр-template `"item.id"` резолвится `resolveNavigateAction`'ом против row.

  ## Behaviour matrix

  | Input                                            | Output                                                                     |
  | ------------------------------------------------ | -------------------------------------------------------------------------- |
  | `"page_detail"` (target.idParam=`"pageId"`)      | `{ action: "navigate", to: "page_detail", params: { pageId: "item.id" } }` |
  | `"unknown_target"` (нет в map)                   | `{ action: "navigate", to: "unknown_target", params: { id: "item.id" } }`  |
  | `{ action: "navigate", to: "x", params: {...} }` | unchanged (structured action passes through)                               |

  ## Tests

  3 новых в `crystallize_v2/workzillaPostBump.test.js` (string→structured / fallback id / structured backward-compat).

  Полный core: **1843/1843 passing**.

  ## Backwards-compatibility

  Existing structured-action `onItemClick` объекты — без изменений. Code-bases, которые **уже** обрабатывают string-onItemClick где-то ещё (например, custom navigation hooks), получат структурированный объект — но это семантически правильное поведение, а не shorthand-в-renderer hack.

## 0.87.0

### Minor Changes

- 6441321: feat(views): §12.11 — `canvas` archetype в `projection.views[]` whitelist + docs

  Закрывает SDK backlog §12.11 (Notion field-test multi-view database). Канонический кейс — Notion-style database с view-переключателем (table / board / gallery / calendar / timeline) на одной выборке.

  ## Что меняется

  ### `packages/core/src/crystallize_v2/mergeViews.js`

  `ALLOWED_VIEW_ARCHETYPES`: добавлен `canvas` (раньше `catalog`/`feed`/`dashboard`). Notion calendar / timeline / Gantt views теперь декларативно работают.

  ### `packages/core/src/crystallize_v2/index.js`

  Canvas-view даёт `slots.body = { type: "canvas", canvasId: view.canvasId || view.id }` (slot-assembly skip — host регистрирует компонент через `registerCanvas`).

  ### Документация

  `docs/projection-views.md` — полный спек multi-view API:

  - inheritance rules (scalar/array replace, objects shallow-merge, Q-level keys blocked)
  - allowed view archetypes (catalog/feed/dashboard/canvas)
  - Notion-style mapping table
  - per-view sort/groupBy
  - threshold ≥2 views для expansion
  - когда не использовать views (use separate projections)

  ## Тесты

  +4 unit:

  - `mergeViews.test.js`: canvas в whitelist + warning сообщение упоминает canvas
  - `viewsIntegration.test.js`: canvas-view даёт `slots.body.type = canvas` с `canvasId` + fallback на `view.id`

  Полный core: **1844/1844 passing** (было 1840/1840).

  ## Backward-compat

  Существующие projections без canvas-views работают без изменений. Wizard / detail / form в view — все ещё warning + fallback на parent.kind (это интенционально: они меняют семантику, не визуализацию).

  ## Следствия для host'а

  Если проект объявил canvas-view, нужно зарегистрировать компонент:

  ```js
  import { registerCanvas } from "@intent-driven/renderer";
  registerCanvas("calendar_view", CalendarCanvas);
  ```

  Canvas-компонент получает стандартные props `world` / `exec` / `viewer` / `ctx` через ArchetypeCanvas.

## 0.86.0

### Minor Changes

- 1f97aa9: feat(ontology): §12.9 — polymorphic FK fields API (`field.kind: "polymorphicFk"`)

  Закрывает SDK backlog §12.9 (Notion field-test). Канонический кейс — `Comment.pageId` XOR `Comment.blockId` в Notion. Раньше автор писал два expression-invariant'а для XOR + exactly-one constraint — теряя declarative shape и derivation-сигналы. Теперь declarative API:

  ```js
  Comment: {
    fields: {
      pageId:  { type: "id", entity: "Page",  optional: true },
      blockId: { type: "id", entity: "Block", optional: true },
      target: {
        kind: "polymorphicFk",
        alternatives: [
          { entity: "Page",  field: "pageId"  },
          { entity: "Block", field: "blockId" },
        ],
        cardinality: "exactly-one",  // или "at-most-one"
      },
    },
  }
  ```

  `target` — virtual field (не хранится как колонка), это metadata о констрейнте. Concrete columns (`pageId`, `blockId`) объявляются как обычные FK с `optional: true`.

  ## API

  | Функция                                                             | Назначение                                                              |
  | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
  | `isPolymorphicFkField(fieldDef)`                                    | type-guard                                                              |
  | `getPolymorphicFkFields(entityDef)`                                 | массив `[{ name, def }]` всех PFK-полей                                 |
  | `getActiveAlternative(row, fkDef)`                                  | `{ entity, field, value } \| null` — какая alternative задана           |
  | `validatePolymorphicFkRow(row, fkDef)`                              | `{ ok, count, reason? }` — проверка cardinality                         |
  | `buildPolymorphicFkInvariants(entities)`                            | авто-генерация expression-invariants для всех PFK в `ontology.entities` |
  | `resolvePolymorphicFkParent(row, fkDef, world, resolveCollection?)` | resolve target row через FK для materializers / FK-graph                |

  `buildPolymorphicFkInvariants` возвращает массив, который автор может либо скопировать в `ontology.invariants`, либо host SDK / engine может вызвать на init. Predicate использует `validatePolymorphicFkRow.ok`.

  ## Cardinality

  - `exactly-one` (default) — ровно одна alternative непустая
  - `at-most-one` — 0 или 1 (для optional FK)

  ## Backwards-compat

  Legacy схема (concrete `pageId` / `blockId` без virtual `target` + ручные expression invariants) продолжает работать. Migration host'а опциональна.

  ## Тесты

  29 unit-тестов (`packages/core/src/ontology/polymorphicFk.test.js`):

  - `isPolymorphicFkField` (4)
  - `getPolymorphicFkFields` (3)
  - `getActiveAlternative` (4)
  - `validatePolymorphicFkRow` exactly-one + at-most-one + invalid (8)
  - `buildPolymorphicFkInvariants` (4)
  - `resolvePolymorphicFkParent` (5)

  Полный core: **1827/1827 passing**.

## 0.85.0

### Minor Changes

- 81fab4f: feat: joint solver Phase 2c — diagnostic helper

  Standalone helper для side-by-side сравнения existing `assignToSlots*`
  output с jointSolver alternate. **НЕ модифицирует** assignToSlots\* —
  caller (host или crystallizeV2) сам решает звать `diagnoseAssignment`.

  API:

  - `extractDerivedAssignment(slots) → Map<intentId, slotName>` — сканирует
    slots-структуру existing assignToSlots\*, извлекает intent → slot
    mapping. Nodes без `intentId` (text, gatingPanel, dataGrid) пропуска-
    ются. Дубликат intent — первое появление wins.
  - `diagnoseAssignment({ INTENTS, projection, ONTOLOGY, derivedSlots,
role?, slots?, solver? }) → Witness | null` — сравнивает derived и
    alternate (через `computeAlternateAssignment`), возвращает witness
    `joint-solver-alternative` с diff'ом и summary, или `null` если
    полное соответствие.

  Witness shape:

  ```
  {
    basis: "joint-solver-alternative",
    reliability: "rule-based",
    archetype, role, solver,
    diff: [
      { intentId, derived, alternate, kind: "divergent" | "derived-only" | "alternate-only" }
    ],
    summary: { total, divergent, derivedOnly, alternateOnly, agreed },
  }
  ```

  Use case (Phase 2c roadmap):

  - Studio показывает side-by-side derived vs alternate для author review.
  - Author видит intents где Hungarian рекомендует другой slot.
  - На основе этого calibration весов (Phase 3) или manual override.

  Phase 2d (intrusive integration внутри `assignToSlots*` через witness
  emit) и Phase 3 (calibration) — отдельные backlog items.

  Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
  Plan: `docs/superpowers/plans/2026-04-27-joint-solver-phase2c-diagnostic.md`.

## 0.84.2

### Patch Changes

- a0c6431: patterns: stable `key` для undoToast overlay entries (closes idf backlog §13.11).

  `undo-toast-window.apply` и `optimistic-replace-with-undo.apply` генерили overlay entries без поля `key` — `validateArtifact` отвергал артефакт с `overlay entry missing "key"`. На host-V2Shell ошибка молча игнорировалась, но любая внешняя crystallize-pipeline (Studio, agent-API, meta-domain runtime-evaluate) ломалась.

  Теперь обе apply-функции эмиттят `key: "undoToast__<intentId>"` — стабильный, deterministic, уникальный per intent. Идемпотентен.

  Найдено через meta-домен (idf-on-idf): `crystallizeV2(salesIntents, ...)` логировал 8+ warnings на user_list / order_list / seller_profile / order_detail / my_order_list.

## 0.84.1

### Patch Changes

- 2ce7906: documentMaterializer: resolve `subCollection.entity` через `findCollection` (closes idf backlog §13.12).

  До этого fix'а `materializeDetail` искал `world[sub.collection]` (legacy plural string) — но `materializeCatalog` и canonical IDF-spec используют `findCollection(world, entity)` (pluralize entity.toLowerCase + CamelCase last-segment). CamelCase subCollections (`{entity: "Intent", foreignKey: "domainId"}`) ломались — секции выходили пустыми.

  Теперь `sub.entity` приоритетнее `sub.collection`, обе формы работают. Backward-compatible: existing проекции с `sub.collection` не ломаются.

  Найдено через meta-домен (idf-on-idf) — `domain_detail` с reverse-association на Intent/Projection/RRule/Witness отдавал 0 sub-sections до fix'а.

## 0.84.0

### Minor Changes

- dd50e54: feat: joint solver Phase 2b — bridge module

  Добавляет `computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts?)` —
  bridge между existing `assignToSlots*` input format и jointSolver
  pipeline. Same signature как assignToSlots\*; diagnostic side-by-side
  для будущей Phase 2c integration.

  API:

  - `getDefaultSlotsForArchetype(archetype)` — default slot models для
    catalog/detail/feed.
  - `computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts?)`
    → `{ assignment, unassigned, witnesses, metadata }`
    - extracts intents через `accessibleIntents`
    - enriches с computed salience (если intent не имеет explicit)
    - applies default slots по `projection.archetype`
    - default solver: `hungarianAssign`; `opts.solver: "greedy"` → fallback
    - `metadata.basis: "joint-solver-alternative"` — diagnostic marker

  opts:

  - `role` — viewer role (default: `projection.forRoles[0]` или `"observer"`)
  - `slots` — override default slot model
  - `solver` — `"hungarian"` (default) | `"greedy"`

  Phase 2c (интеграция в `assignToSlotsCatalog/Detail` через diagnostic
  witness emit) и Phase 3 (calibration) — отдельные backlog items.

  Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
  Plan: `docs/superpowers/plans/2026-04-27-joint-solver-phase2b-bridge.md`.

## 0.83.0

### Minor Changes

- 8906467: feat: joint solver Phase 2a — Hungarian algorithm (optimal assignment)

  Добавляет `hungarianAssign(matrix, slots)` — drop-in replacement для
  `greedyAssign` с гарантией global optimum через Munkres O(n³).

  API:

  - `hungarianMatch(squareCost) → number[]` — core algorithm на square
    cost matrix; возвращает permutation минимизирующую `∑ C[i][a[i]]`.
  - `expandSlots(slots) → Array<{ virtualName, physicalName }>` —
    capacity > 1 → virtual single-capacity slot-slots.
  - `hungarianAssign(matrix, slots) → { assignment, unassigned, witnesses }`
    — wrap'ит `hungarianMatch` с padding до квадратной матрицы для
    rectangular n × N случая. Same shape как `greedyAssign`.

  Реализация:

  - `INFINITY_COST` маппится в `BIG = 1_000_000` (Hungarian не работает с
    Infinity).
  - Slack rows (i ≥ n) — cost 0 (slot не получает intent).
  - Slack columns (j ≥ N) — cost BIG (intent unassigned, witness
    `ill-conditioned`).
  - Safety guard на бесконечный цикл (не должен срабатывать на корректном
    input'е).

  Property tests:

  - Bijection invariant — `hungarianMatch` возвращает permutation.
  - Optimality — `hungarianMatch == brute-force minimum` для n ≤ 4.
  - `Hungarian total cost ≤ Greedy total cost` (50 runs).
  - Capacity respect (50 runs).

  Phase 2b (parity tests против real domains) и Phase 2c/2d (интеграция
  в `assignToSlotsCatalog/Detail`) — отдельные backlog items.

  Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2.
  Plan: `docs/superpowers/plans/2026-04-26-joint-solver-phase2a-hungarian.md`.

## 0.82.1

### Patch Changes

- 3cb1b35: fix(materializers): §12.4 — domain fallback в voice/document

  Закрывает SDK backlog §12.4 (Notion field-test). Без `opts.domain`:

  **Раньше**:

  - voice: `meta.domain: ""`, system prompt `для домена «»`, subtitle `домен `
  - document: `meta.domain: ""`, subtitle `Домен: `

  **Теперь**:

  - voice / document: `resolvedDomain = opts.domain || opts.ontology?.name || opts.ontology?.domain || ""`
  - При empty fallback — domain нигде не упоминается (subtitle empty, system prompt без `для домена «...»`).

  Backwards-compatible: `opts.domain` имеет приоритет над `opts.ontology`. Существующее поведение при non-empty `opts.domain` не изменилось.

  Tests: 7 новых (`packages/core/src/materializers/domainFallback.test.js`) — все 4 кейса для voice + 3 для document. Полный core-suite 1763/1763.

## 0.82.0

### Minor Changes

- d877396: feat: joint solver Phase 1 — pure cost matrix + greedy assignment

  Добавляет фундаментальные функции для будущей замены `assignToSlots*`:

  - `classifyIntentRole(intent, mainEntity?)` → `string[]` — slot-роли по
    salience tier'ам (primary / secondary / navigation / utility) +
    destructive flag по `remove`-effect на `mainEntity` (orthogonal,
    multi-role).
  - `buildCostMatrix({ intents, slots, mainEntity? })` →
    `{ cost, rowIndex, colIndex, slotNames, intentIds }` — строит
    `cost[i][s] = -salience(intent_i)` если slot принимает intent (по
    ролям), `INFINITY_COST` иначе.
  - `greedyAssign(matrix, slots)` →
    `{ assignment, unassigned, witnesses }` — sort intents по min-cost,
    distribute с capacity respect. Unassigned → witness `basis:
"ill-conditioned"` reliability `rule-based`.
  - `INFINITY_COST` — `Number.POSITIVE_INFINITY` константа для
    декларативной проверки feasibility.

  Phase 1 живёт **параллельно** с существующим `assignToSlots*` —
  интеграция в `assignToSlotsCatalog/Detail` и Hungarian algorithm —
  Phase 2 после parity tests. Calibration на 21 ручном решении из
  `salience-suggestions.md` — Phase 3.

  Tests: 27 unit + 4 property × 50-100 runs (1700 → 1727 core regression).

  Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A2 (PR #366).
  Plan: `docs/superpowers/plans/2026-04-26-joint-solver-phase1.md`.

## 0.81.0

### Minor Changes

- 49209a0: feat: incremental fold + structural snapshots (A1)

  Добавляет API для кэширования fold:

  - `createSnapshot(effects, typeMap?) → Snapshot` — `world_k` плюс метаданные
    `{ count, lastEffectId, lastCreatedAt, typeMap }`.
  - `foldFromSnapshot(snapshot, deltaEffects, typeMap?) → World` — apply
    дельты на `snapshot.world`. Не мутирует snapshot. Семантика:
    `foldFromSnapshot(createSnapshot(prefix), delta) ≡ fold(prefix.concat(delta))`.
  - `fold(effects, typeMap, { snapshot })` — третий arg для incremental
    режима. Backward-compat сохранён: `fold(effects)` и `fold(effects, typeMap)`
    без изменений.
  - `applyEffect`, `getCollectionType` — извлечены из inline тела `fold` как
    переиспользуемые helpers.

  Алгебраическая гарантия (моноид: identity = `{}`, composition = sequential
  apply): property test через fast-check, 4 свойства × 100 runs покрывают
  add-only, add+replace, add+remove, snapshot immutability при многократных
  вызовах.

  Бенчмарк (10K Φ, split 9K+1K): foldFromSnapshot 4× быстрее full fold
  (0.47 ms vs 1.87 ms на host machine).

  Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A1.
  Plan: `docs/superpowers/plans/2026-04-26-incremental-fold-snapshots.md`.

  Phase 2 (engine `validator.foldWorld` caching, scoped fold per role) —
  отдельный backlog item.

## 0.80.0

### Minor Changes

- 527c8af: feat(crystallize): agent_console archetype passthrough в crystallize_v2

  agent_console (8-й archetype, добавлен в renderer 0.48 через PR #304)
  не имел crystallize-side support. Default ветка else в archetype-dispatch
  (crystallize_v2/index.js) попадала в `assignToSlots`, который
  синтезирует catalog/feed/detail body по mainEntity. Это означало:
  agent_console projection в проде рендерилась как **catalog по
  mainEntity**, не как ChatInput + SSE timeline.

  Симптом в Fold invest tenant'е: после bumps + ROOT_PROJECTIONS fix
  sidebar показывает 3 items, agent_console попадает первым, но клик
  рендерит catalog Portfolio rows вместо AgentConsole UI.

  Fix:

  1. Добавлен branch `else if (archetype === "agent_console")` —
     passthrough body `{type: "agent_console", mainEntity}`. Renderer
     AgentConsole archetype (PR #351 dispatch) распакует.
  2. Pattern Bank apply skip для agent_console (custom archetype без
     slots-структуры, structure.apply не применим).

## 0.79.0

### Minor Changes

- e18aa38: feat(core): закрытие §12.1 + §12.2 (Notion field test follow-ups)

  **§12.1 — `projection.archetype` → `projection.kind` unification.** Manifesto использует термин `archetype` (feed/catalog/detail/canvas/dashboard/wizard/form), runtime SDK читает `projection.kind`. 7 из 14 доменов писали `archetype:` — materializer'ы (`materializeAsDocument` / `materializeAsVoice`) не находили switch-case → пустой output. Закрытие: новый `normalizeProjection(proj)` / `normalizeProjections(map)` копирует `archetype` → `kind` если `kind` отсутствует. Применён в трёх местах:

  - `crystallizeV2` entry — нормализация PROJECTIONS map перед iteration.
  - `materializeAsDocument` entry — single projection.
  - `materializeAsVoice` entry — single projection.

  Идемпотентен, не мутирует input, no-op если `kind` уже задан.

  **§12.2 — Voice materializer primary-field discovery.** Hard-coded `r.name || r.title || r.ticker || r.id` в трёх местах (voiceCatalog/voiceDetail/voiceFeed) ломал озвучку для доменов с нестандартными primary-field именами. Закрытие: новый `getPrimaryFieldName(entityDef)` / `getPrimaryFieldValue(row, entityDef)` с приоритетом:

  1. Явный `fieldRole: "primary"` или legacy `"primary-title"`.
  2. Hardcoded fallback names: `name` / `title` / `label` / `displayName` / `ticker`.
  3. Первое text-поле (не `id`).
  4. `"id"` ultimate fallback.

  Voice материализатор теперь принимает `ontology` через `opts` (был и раньше) и пробрасывает в catalog/detail/feed/dashboard helpers. Notion Page (`title` field) озвучивается корректно: «первый: Engineering Wiki» вместо «первый: undefined».

  **Public API:**

  - `normalizeProjection(projection)`
  - `normalizeProjections(projections)`
  - `getPrimaryFieldName(entityDef)`
  - `getPrimaryFieldValue(row, entityDef)`

  **Backward-compat.** Все 4 helper'а — additive. `archetype` остаётся в projection (не удаляется). Старые domains с `kind:` или с hardcoded `name`/`title` работают как раньше.

  **Tests.** 26 новых (7 normalizeProjection / 12 getPrimaryFieldName / интеграция через materializer тесты). 1697/1697 общий core suite без регрессий.

## 0.78.0

### Minor Changes

- 52d82e2: fix(crystallize_v2): default `collection` key для subCollection без override

  `buildSection` в `assignToSlotsDetail` раньше брал `subDef.collection` буквально и возвращал `section.source = undefined`, если автор писал только `{entity, foreignKey, title}`. В renderer'е `SubCollectionSection` лукапил `ctx.world?.[undefined]` → empty list → секция показывала «(0)» даже когда rows в Φ есть.

  Теперь, если `collection` не задан, фоллбэк на `camelPlural(entity)` (`Transaction → transactions`, `Category → categories`, `Glass → glasses`) — совпадает с host-side `foldEffects` / `filterWorldForRole.camelPluralize`. Author override остаётся priority — non-стандартные collection-ключи (e.g. `m2m-via` join entities) не ломаются.

  Live impact: invest-portfolio-ai subCollection «Транзакции» рендерил `(0)` с 8 транзакциями в Φ; после fix'а каждая ontology без явного `collection` поля автоматически разрешается.

## 0.77.0

### Minor Changes

- 02d1bf5: feat(core): permission-inheritance API (§12.8 closure)

  Декларативный `entity.permissionInheritance` для cascading visibility row'ов через self-referential parent chain с fallback'ом на root entity. Закрывает P0-gap из Notion field test (18-й полевой, 2026-04-26): permission-наследование Page → parent Page → Workspace.defaultPermissionLevel не выражалось в формате — host'ы были вынуждены писать кастомный фильтр в обход `filterWorldForRole`.

  **API:**

  ```js
  Page: {
    permissionInheritance: {
      via: "pagePermissions",          // collection с per-row override'ами
      matchField: "pageId",            // override.pageId === row.id
      userField: "userId",             // override.userId === viewer.id
      levelField: "level",             // override.level — текущий уровень
      parentField: "parentPageId",     // self-ref FK; null = root
      rootEntity: "Workspace",         // entity-fallback (опц.)
      rootMatchField: "workspaceId",   // row.workspaceId → Workspace.id
      rootLevelField: "defaultPermissionLevel",
      levels: ["none", "view", "comment", "edit"],
      requiredLevel: "view",           // минимум для visible (default: "view")
    }
  }
  ```

  **Семантика.** При фильтрации row для viewer'а: walk up `parentField` chain, ищется closest override (`matchField === ancestor.id AND userField === viewer.id`). Если не найден — fallback на `rootEntity[row[rootMatchField]][rootLevelField]`. Сравниваем effective level с `requiredLevel` через `levels.indexOf` (последний — highest). Защита от циклов: 64 hops max + visited Set.

  **Owner-роли пропускают inheritance** (видят всё, как и до этого PR'а через `getOwnerFields` логику).

  **Backward-compat.** Ontology без `permissionInheritance` ведёт себя как раньше — никаких изменений в существующих доменах.

  **Применимо к.** Любой self-referential domain с per-row ACL: Notion / Confluence / Filesystem / Org-tree / Wiki-spaces.

  **Public API:**

  - `resolveInheritedPermission(row, viewerId, config, world)` → level | null
  - `isInheritablePermission(entityDef)` → boolean
  - `isPermissionSufficient(level, config)` → boolean
  - Интегрировано в `filterWorldForRole` (3-й приоритет: scope > reference > **inheritance** > ownerField).

  **Tests.** 19 новых (10 unit для resolve, 3 для validator, 6 интеграционных с filterWorld'ом). 1635/1635 общий core suite без регрессий.

## 0.76.0

### Minor Changes

- 6845860: feat(ontology): canonical type-map + auto field-mapping FE↔BE (P0.4 — backlog §9.1, 2026-04-26)

  Закрывает три полевых боли, наблюдаемых в трёх независимых production-стэках:

  - 70+ ручных трансформ `camelCase ↔ snake_case` при FE↔BE bridge;
  - 200+ нормалайзеров (`{dataSourceId} ↔ {'data source': ...}`);
  - importers (postgres / openapi / prisma) кладут `type: "string"`, а `crystallize_v2` ждёт canonical `text` — silent drop без manual mapping.

  ## Новый API в `@intent-driven/core` (re-exported из `core/src/index.js`)

  | Function                                                  | Назначение                                                                                                                                                                                                                                                                                                                        |
  | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `CANONICAL_TYPES`                                         | frozen-list (~40) канонических field-types: text/textarea/markdown/json/yaml/code, number/integer/decimal/money/percentage, boolean, date/time/datetime/duration, id/uuid/slug, email/url/phone/secret, select/multiSelect/enum, entityRef/entityRefArray/foreignKey, image/file/color, coordinate/address/zone, ticker, manifest |
  | `TYPE_ALIASES`                                            | словарь aliases → canonical: `string→text`, `int/bigint/serial→integer`, `float/double/numeric→decimal`, `bool→boolean`, `timestamp→datetime`, `jsonb→json`, `ManyToOne→entityRef`, etc.                                                                                                                                          |
  | `normalizeFieldType(rawType)`                             | alias → canonical lookup, case-insensitive fallback, graceful degradation для unknown                                                                                                                                                                                                                                             |
  | `normalizeFieldDef(rawFieldDef)`                          | нормализует целое поле + derive `entityRef` shape из `references` / `entityRef` shorthand                                                                                                                                                                                                                                         |
  | `camelToSnake(name)` / `snakeToCamel(name)`               | name-bridge с поддержкой acronym-runs (URLPath → url_path)                                                                                                                                                                                                                                                                        |
  | `inferWireFieldName(name, { case })`                      | auto-derive «имени на проводе»                                                                                                                                                                                                                                                                                                    |
  | `applyFieldMapping(obj, mapping, "toWire" \| "fromWire")` | преобразует ключи объекта по explicit mapping без мутации                                                                                                                                                                                                                                                                         |
  | `buildAutoFieldMapping(fields, options)`                  | авто-генерация mapping'а из ontology fields (тривиальные пары исключаются)                                                                                                                                                                                                                                                        |

  ## Use-cases

  - **Importers** (postgres / openapi / prisma): kладут `type: "string"` → `normalizeFieldType` приводит к `text`. `references: "User"` → автоматически `type: "entityRef"`.
  - **Effect-runners**: `applyFieldMapping(payload, mapping, "toWire")` перед PUT/POST на BE; `applyFieldMapping(response, mapping, "fromWire")` после GET.
  - **Crystallize_v2 input cleanup**: `normalizeFieldDef` поверх raw fields перед `buildFormSpec` — закрывает Workzilla post-bump §9.1 (`type:"string"` теперь корректно превращается в text-control).

  ## Status: utility-layer

  Не trigger'ится автоматически в fold/filterWorld. Importers и effect-runners (включая third-party) могут начать использовать сразу. Backward-compatible: legacy `type: "string"` продолжает работать (через alias), новые типы — additive.

  43 новых теста в `packages/core/src/ontology/typeMapping.test.js` (suite 1616 → 1659).

## 0.75.0

### Minor Changes

- c8ae9ff: feat(ontology): `entity.kind: "polymorphic"` + `discriminator` + `variants[]` API (P0.2 — §14 ext, 2026-04-26)

  Расширение taxonomy `entity.kind` (раньше: `internal` / `reference` / `mirror` / `assignment`) — добавлен `polymorphic`. Полевые тесты с 70+ и 200+ подтипами кубов в production workflow-editor стэках показали, что без формализации polymorphic entity host-авторам приходится держать 3 параллельных декларации (frontend type / backend DTO / form-renderer) — итого ~21k LOC ручного бойлерплейта на 70 типов. Эта surface закрывает gap на ontology-уровне: одна декларация → всё derive'ится.

  Схема:

  ```js
  WorkflowNode: {
    kind: "polymorphic",
    discriminator: "type",
    fields: {
      // base fields shared by all variants
      id: { type: "id" },
      type: { type: "select" },
      label: { type: "text" },
      workflowId: { references: "Workflow" },
    },
    variants: {
      ManualTrigger: { label: "Manual trigger", fields: {} },
      TelegramTrigger: {
        label: "Telegram trigger",
        fields: {
          botToken: { type: "secret", fieldRole: "auth" },
          webhookUrl: { type: "url" },
        },
        invariants: [{ kind: "expression", expr: "..." }],
      },
      // ...
    },
  }
  ```

  Новый публичный API в `@intent-driven/core`:

  - `isPolymorphicEntity(entityDef) → boolean`
  - `getDiscriminatorField(entityDef) → string | null`
  - `getEntityVariants(entityDef) → Record<string, variantDef>`
  - `getEntityVariant(entityDef, value) → variantDef | null`
  - `listVariantValues(entityDef) → string[]` — для wizard'а / dropdown options
  - `getEffectiveFields(entityDef, value?) → fieldsDict` — base + active variant fields (variant override priority)
  - `getUnionFields(entityDef) → fieldsDict` — base + ВСЕ variants (для form-archetype synthesis с conditional visibility)
  - `getVariantSpecificFields(entityDef, value) → string[]` — fields only present in variant
  - `validatePolymorphicEntity(entityDef) → { valid, errors[] }` — schema-валидатор с понятными ошибками

  **Status:** matching-only / declarative API. Production-derivation (form-archetype synthesis на discriminator + per-variant fields, filterWorld awareness, materializer-output) — отдельный sub-project. Host'ы могут начать использовать API сразу — backward-compat реализован: legacy entity без `kind:"polymorphic"` обрабатывается прозрачно (`getEffectiveFields` возвращает base.fields, `getUnionFields` тоже, validate всегда `valid: true`).

  30 новых тестов в `packages/core/src/ontology/polymorphic.test.js` (suite 1586 → 1616).

## 0.74.0

### Minor Changes

- 1b78568: feat(core): явная weighted-sum salience-функция (Phase 2)

  Добавляет формальный механизм приоритизации intent'ов через линейную
  комбинацию 13 наблюдаемых фич:

  - `extractSalienceFeatures(intent, ctx)` — извлекает вектор фич
    (explicitNumber, explicitTier, tier1-4, creatorMain, phaseTransition,
    irreversibilityHigh, removeMain, readOnly, ownershipMatch, domainFrequency)
  - `FEATURE_KEYS` — фиксированный контракт набора фич
  - `salienceFromFeatures(features, weights?)` — Σ wᵢ·featureᵢ
  - `DEFAULT_SALIENCE_WEIGHTS` — веса по умолчанию, откалиброванные под
    поведение implicit ladder (tier1CanonicalEdit/creatorMain=80, tier3Promotion=70 и т.д.)
  - `bySalienceDesc(a, b, ctx?)` — опциональный третий аргумент ctx:
    при наличии — weighted-sum режим; без ctx — backward-compat pre-computed ladder
  - `projection.salienceWeights` — per-projection override весов (мержится поверх DEFAULT)
  - call-sites в `assignToSlotsDetail` и `assignToSlotsCatalog` обновлены на ctx-режим

  Host-скрипт `salience-fit-weights.mjs` для калибровки на labeled-dataset (21 суждение)
  — отдельный PR в DubovskiyIM/idf (Task 2.3).

## 0.73.0

### Minor Changes

- 909b5ae: feat(core): Information Bottleneck фильтр на uiSchema

  Поле сущности появляется в uiSchema проекции ⟺ хотя бы один
  accessible intent читает или пишет это поле. Заменяет «всё по
  умолчанию + manual exclude». Author override через projection.
  uiSchema.{include,exclude}Fields. Witness 'information-bottleneck'
  для CrystallizeInspector.

  Новые экспорты из @intent-driven/core:

  - accessibleIntents(projection, role, INTENTS, ONTOLOGY)
  - intentTouchesEntity(intent, entityName)
  - (internal) intentReadFields, intentWriteFields, applyInformationBottleneck

## 0.72.0

### Minor Changes

- f87a00e: feat(patterns): 4 candidate-паттерна из tri-source field research (2026-04-25)

  Добавлены matching-only candidate'ы в `packages/core/src/patterns/candidate/`. Все четыре независимо проявились в трёх независимых production-стэках (два workflow-editor field-test'а + Angular-imperative legacy с 200+ полиморфными кубами и 18-fork brand-overlay), что подтверждает их как стабильные UX-формы:

  - `cross/human-in-the-loop-gate` — приостановка execution до confirmation от человека-supervisor'а (отличается от irreversible-confirm: асинхронная пауза с возможной сменой actor'а, structured input).
  - `cross/composition-as-callable` — entity-as-tool с input/output schema, «Used by» reverse-association, «Run standalone» CTA.
  - `cross/agent-plan-preview-approve` — multi-effect plan-preview между agent-роли intent.proposed и intent.confirmed; partial-approve toggle.
  - `detail/lifecycle-gates-on-run` — declarative issue-checklist (cardinality / referential / expression invariants) + disabled run/publish CTA + deep-link к причине.

  Каждый имеет полный shape: trigger.requires (только существующие kinds), structure (slot + description, без apply), rationale (hypothesis + 4-7 evidence + 4-5 counterexample), falsification (4-5 shouldMatch / 4-5 shouldNotMatch).

  Suite растёт: `CURATED_CANDIDATES.length` 6 → 10. 1517/1517 core-тестов зелёные (+16). Promotion в stable + structure.apply — отдельный sub-project на каждый паттерн (требует расширения trigger.kind taxonomy и новых renderer primitives).

## 0.71.3

### Patch Changes

- 06af3d7: chore: убраны имена внешних продуктов из исходников и комментариев `@intent-driven/core`

  Заменены имена field-test источников на нейтральные обозначения («workflow-editor field-test», `fieldTestOntology`, `fieldTestGroupProjection`). Затронутые места:

  - `packages/core/src/patterns/registry.js` — комментарии у import/STABLE_PATTERNS entry для `bidirectional-canvas-tree-selection`.
  - `packages/core/src/patterns/stable/cross/bidirectional-canvas-tree-selection.js` — header doc-block, rationale.evidence, falsification.shouldMatch reason.
  - `packages/core/src/patterns/stable/cross/bidirectional-canvas-tree-selection.test.js` — переименованы тестовые fixture-переменные.
  - `packages/core/src/patterns/candidate/curated.js` — комментарий promotion-history.
  - `packages/core/CHANGELOG.md` — формулировки в записях `0.66.1` и `0.67.x`.

  Без функциональных изменений. 1501/1501 core-тестов зелёные.

## 0.71.2

### Patch Changes

- a3bc599: fix(patterns): resource-hierarchy-canvas — findSelfRefField распознаёт IDF importer FK convention

  Исправляет ошибку в `findSelfRefField`: не матчил поля вида `{ type: "entityRef", kind: "foreignKey", references: "Entity" }` — это стандартный формат IDF importer-openapi для foreign key полей (в отличие от прямого `type:"foreignKey"`).

  Также добавлена поддержка `parent<EntityName>` convention (без Id-суффикса, пример: `parentResource` в ArgoCD Resource entity) параллельно с существующим `parent<EntityName>Id`.

  Praktический эффект: ArgoCD `Resource.parentResource` теперь корректно детектируется как self-referential FK, что позволяет паттерну auto-derive `renderAs:{type:"resourceTree"}` для Resource subCollection без host-workaround.

## 0.71.1

### Patch Changes

- 78ea029: fix(patterns): dual-status-badge-card + resource-hierarchy-canvas поддерживают fieldDef.options наравне с fieldDef.values

  Trigger и apply обоих паттернов проверяли только `fieldDef.values`, но importer-openapi и ArgoCD ontology используют `fieldDef.options` (конвенция OpenAPI `enum`). Добавлен fallback: `fieldDef.values ?? fieldDef.options`.

  Затрагивает:

  - `looksLikeStatusField` в обоих паттернах
  - `pickStatusWitnesses.values` в `dual-status-badge-card`
  - `findStatusFields.values` в `resource-hierarchy-canvas`

  Без этого fix'а паттерны не матчили ArgoCD Application/Resource entities (которые используют `type: "select", options: [...]` вместо `type: "string", values: [...]`).

## 0.71.0

### Minor Changes

- 2eb4524: Паттерн `diff-preview-before-irreversible` (stable, cross, Sprint 1 P0 #5).

  Расширяет `irreversible-confirm`: когда у mainEntity есть dual-state пара полей
  (current/target, live/desired, before/after, fieldRole current-state/desired-state)
  и intent с irreversibility === "high", добавляет `showDiff: true` + `diffFields`
  в confirmDialog overlay.

  Эталоны: ArgoCD rollback dialog (YAML diff), GitHub PR merge, Terraform plan output.
  20 тестов (trigger.match ×7, structure.apply ×6, helpers ×4, schema ×3).

- 93c6cf3: feat(patterns): form-yaml-dual-surface — toggle Form / YAML editor для declarative resources (closes G-A-7)

  Promote из argocd-pattern-batch (rancher-manager candidate, 2026-04-24). **Закрывает backlog §10 G-A-7** (yamlEditor archetype в ArgoCD host). Declarative resources имеют bimodal аудиторию: новички — guided form, power-users — YAML manifest. Dual-surface с toggle решает задачу без выбора.

  **Trigger**: form/detail + entity с yaml/manifest fields (type=yaml|json|manifest, fieldRole=manifest|spec|template), entity.resourceClass (k8s/helm/terraform), или K8s convention (apiVersion + kind + metadata).

  **Apply**: form → slots.form.renderAs={type:"formYamlDualSurface"}; detail → slots.body.renderAs={type:"formYamlDualSurface"}. Author-override: no-op если renderAs задан.

- 84d6001: feat(patterns): generator-preview-matrix — preview N generated instances перед bulk commit

  Promote'ится из argocd-pattern-batch (2026-04-25, Sprint 1 P0 #6). **Закрывает backlog §10 G-A-3** (ApplicationSet generator preview gate): template-entity с bulk-creation intent получает preview-матрицу перед confirm'ом вместо «слепого» применения.

  **Trigger**: detail + mainEntity имеет template-like field (name ∈ {template, spec, definition, generator, blueprint} ИЛИ fieldRole === "template") + поле generated output (name matches /generated|instances|applications|jobs|outputs/ ИЛИ fieldRole === "generated-instances") + хотя бы один bulk-creation intent (creates содержит [] ИЛИ intent.bulk === true ИЛИ creates !== mainEntity).

  **Apply**: добавляет overlay `{ id: "generator_preview", type: "generatorMatrix", templateField, instancesField, columns, source }` к `slots.overlays`. Columns выводятся из generated-entity (name/namespace/cluster/status/id в порядке PREFERRED_COLUMNS) или fallback ["name", "id"]. No-op если overlay уже задан. Author-override: `projection.generatorPreview: false`.

  **Эталоны**: ArgoCD ApplicationSet (generator → N Applications), GitHub Actions matrix (strategy.matrix), Jenkins build matrix, Terraform plan (preview gate).

  Stable count: 39 → 40. 30 новых тестов (detectTemplateField × 8, detectGeneratedField × 5, trigger.match × 9, structure.apply × 8).

- 8131d17: feat(patterns): global-scope-picker — header scope-switcher для multi-tenant/cluster admin

  Новый stable pattern (Sprint 1 P0 #7). Promote'ится из rancher-manager-global-scope-picker candidate (argocd-pattern-batch 2026-04-24). Связан с ArgoCD dogfood backlog §10 G-A-1.

  **Гипотеза**: Когда 80%+ namespaced projection'ов живут под одним discriminator (tenant/cluster/workspace/realm), sidebar-фильтр требует O(n) кликов при переключении контекста. Header-picker даёт O(1) переключение — глобальный scope применяется ко всем view автоматически.

  **Trigger**: ontology содержит ≥1 scope entity (isScope: true | kind: "reference" | naming convention: Tenant/Cluster/Workspace/Realm/Namespace/Project/Environment/Organization) AND ≥3 других entities имеют FK-зависимость (field `<scopeLower>Id` | `references === scopeName` | entityRef с именем содержащим scopeLower). OR: `projection.scope` явно задан.

  **Apply**: дополняет `slots.header` полем `scopePicker: { entity, label, source }`. No-op если scopePicker уже задан (author-override) или scope entity не найдена.

  **Эталоны**: Rancher Manager (cluster picker), ArgoCD (project filter), Kubernetes Dashboard (namespace picker), Keycloak (realm switcher), Grafana (org switcher).

  **Falsification**: shouldMatch: argocd/applications_list (Project kind=reference), keycloak/clients_list (Realm isScope=true). shouldNotMatch: lifequest/dashboard (single-user), planning/my_polls (<3 scoped entities).

  21 тест (trigger × 8, structure.apply × 9, helpers × 4). Bump stable count: 39 → 40.

  Helpers экспортированы для reuse: `findScopeEntity`, `countScopedEntities`, `humanize`.

- 56d08ce: feat(patterns): spec-vs-status-panels — двухпанельный split declarative/observed state

  Promote'ится из flux-weave-gitops candidate (2026-04-24) в рамках ArgoCD dogfood sprint. В декларативных reconciliation-системах (GitOps, K8s, Terraform, Flux/ArgoCD) пользователю критично различать «что я задекларировал» (spec) vs «что контроллер применил» (status/observed). Плоский detail скрывает drift.

  **Trigger**: detail + mainEntity имеет ≥1 spec-like поле (fieldRole==="spec" OR имя в spec-словаре: sourceRef, targetRevision, path, interval, chartVersion, desired...) AND ≥1 status-like поле (fieldRole==="status" OR имя в status-словаре: conditions, lastAppliedRevision, phase, health, syncStatus, message...).

  **Apply**: выставляет `body.layout = "spec-status-split"` + `body.specFields` + `body.statusFields`. Author-override: no-op если `body.layout` уже задан. Экспортирует `_helpers: { detectSpecFields, detectStatusFields }` для тестов и reuse.

## 0.70.0

### Minor Changes

- f1c9aa0: feat(patterns): resource-hierarchy-canvas — sub-collection с self-FK + status автоматически рендерится как resourceTree

  Promote'ится из argocd-pattern-batch (2026-04-24, ArgoCD/Flux/Spinnaker/Rancher batch). **Закрывает backlog §10 G-A-2** (ArgoCD inline-children resources): host больше не должен вручную выставлять `section.renderAs = { type: "resourceTree", ... }` для tree-shaped sub-entities.

  **Trigger**: detail + sub-entity (FK to mainEntity) с собственным self-referential FK (parentXxxId / parentId / explicit FK to self) + ≥1 status-like enum-полем (fieldRole === "status" ИЛИ name endsWith "Status"/"State"/"Phase"/"Health").

  **Apply**: для каждой section в slots.sections, чьё itemEntity матчит, выставляет `section.renderAs = { type: "resourceTree", parentField, nameField, kindField?, badgeColumns: [{field, label}] }`. Renderer dispatcher (renderer/src/archetypes/SubCollectionSection.jsx §10.4c) подхватывает и рендерит через `<ResourceTree>` primitive. Author-override: no-op если `section.renderAs.type` уже задан.

  **Эталоны**: ArgoCD Application resource tree (Deployment → ReplicaSet → Pod), Kubernetes Dashboard ownerReferences graph, Temporal child workflows, Lens IDE.

  Renderer-инфраструктура (`ResourceTree` primitive, `renderAs.type === "resourceTree"` dispatcher) уже существовала из ArgoCD Stage 5 host-workaround — pattern автоматизирует выставление config'а.

## 0.69.0

### Minor Changes

- 40b5213: feat(patterns): dual-status-badge-card — карточка catalog'а с двумя orthogonal status-badge'ами

  Promote'ится из argocd-pattern-batch (2026-04-24, ArgoCD/Flux/Spinnaker/Rancher batch). Status-driven admin (GitOps, K8s, CI/CD) выводит ≥2 независимых status-axes на одну карточку — ArgoCD Application имеет sync (Synced/OutOfSync/Unknown) + health (Healthy/Progressing/Degraded/...). Один derived badge скрывает orthogonality и diagnostic info.

  **Trigger**: catalog + mainEntity содержит ≥2 enum-полей-status (fieldRole === "status" ИЛИ name endsWith "Status"/"State"/"Phase") в witnesses проекции.

  **Apply order**: после grid-card-layout (badges релевантны только в card-визуале). Расширяет cardSpec через `badges: [{bind, label, values}, ...]`. Backfill'ит legacy `cardSpec.badge` ← `badges[0]`. No-op если author уже задал badges или body.layout != grid.

  **Renderer**: GridCard читает `cardSpec.badges` array, рендерит chip-style atoms; fallback на single `cardSpec.badge` для backward-compat.

## 0.68.0

### Minor Changes

- 1ef7032: feat(patterns): promote `bidirectional-canvas-tree-selection` → stable

  Финальный шаг promotion-path: candidate → stable после закрытия трёх gate'ов:

  - Gate 1 (#303): trigger.kind `co-selection-group-entity` (schema-level)
  - Gate 2 (#308): renderer primitive `CoSelectionProvider` + hooks
  - Gate 3 (#311): adapter capability `interaction.externalSelection` +
    `useCoSelectionEnabled` gate

  Changes:

  - New `packages/core/src/patterns/stable/cross/bidirectional-canvas-tree-selection.js`
    с `structure.apply` (opt-in через `ontology.features.coSelectionTree` или
    `projection.patterns.enabled`). Apply prepend'ит `coSelectionTreeNav` node
    в `slots.sidebar` с `{ groupEntity, parentField, memberField, targetEntity }`.
  - Removed `packages/core/src/patterns/candidate/cross/bidirectional-canvas-tree-selection.js`
    (и пустая директория candidate/cross/).
  - `curated.js` — удалён import/export; комментарий обновлён на "Promoted
    в stable 2026-04-24".
  - `curated.test.js` — счётчик 7 → 6, archetype distribution: catalog/detail
    (cross promoted).
  - `falsification.test.js` — счётчик 36 → 37.
  - `registry.js` — импорт + STABLE_PATTERNS entry.

  17 новых тестов в `stable/cross/bidirectional-canvas-tree-selection.test.js`:

  - schema validity (validatePattern, status/archetype/trigger/apply invariants)
  - trigger matching на field-test ontology (Group matches, Node/Workflow/Ghost fail)
  - structure.apply: opt-in gate (no-op без signal), happy-path с feature flag
    и с projection.patterns.enabled, prepend preserves existing sidebar items,
    idempotency, no-op при отсутствии array-ref/self-ref, explicit config override
  - explainMatch integration на field-test JSON-shape (Group matched, Node NOT matched)

  1339/1339 core tests зелёные.

## 0.67.0

### Minor Changes

- b5e8ab6: feat(patterns): trigger.kind `co-selection-group-entity` для cross-projection паттернов

  Новый trigger kind в `patterns/schema.js` — validates group-entity shape:
  entity с (а) array-valued entity-ref field (visual members) + (б) self-reference
  (иерархия папок/групп). Первый из трёх promotion-gate'ов для
  `bidirectional-canvas-tree-selection` (candidate → stable).

  Supported field shapes для `memberField`:

  - `{ type: "entityRefArray", references: "Target" }`
  - `{ type: "entityRef[]", references: "Target" }`
  - `{ references: "Target", array: true }` / `multi: true`
  - `{ entityRef: "Target", array: true }` / `many: true`

  Supported shapes для `parentField`: `{ references | entityRef: "<self>" }`.

  Оба поля auto-detected (scan), либо заданы явно через `req.memberField` /
  `req.parentField`.

  13 новых тестов: canonical + shorthand + `entityRef[]` variants, 4
  negative-cases (нет array-ref, нет self-ref, scalar FK, bogus array без
  references), explicit memberField/parentField happy + mismatch, validatePattern
  accepts new kind. 1320/1320 core tests зелёные.

## 0.66.1

### Patch Changes

- 120ffc6: feat(patterns): candidate `bidirectional-canvas-tree-selection` (cross-archetype)

  Добавлен curated-candidate в `packages/core/src/patterns/candidate/cross/` —
  первый формализованный cross-projection state-sharing паттерн. Описывает
  co-selection между canvas-archetype проекцией (граф/map/flow) и
  catalog+hierarchy-tree-nav проекцией, группирующей элементы canvas по
  semantic buckets (правила, папки, workflow-группы).

  Источник: workflow-editor field-test dogfood 2026-04-24. Полевая валидация —
  Figma layers, n8n workflow zones, Dataiku DSS, Blender hierarchy,
  React DevTools, VSCode outline. Field-test JSON (`thirdPartyData.gui.groups`
  с `nodeIds[]` + `parentGroupId`) — конкретный shouldMatch-кейс.

  Status: matching-only. Promotion в stable требует:

  - новый trigger.kind `co-selection-group-entity` в schema.js;
  - renderer primitive contract для shared `__ui.selection.nodeIds`;
  - adapter capability `supportsExternalSelection` для graceful fallback.

  Registered в `curated.js`. validatePattern (falsification.shouldMatch ×3 +
  shouldNotMatch ×5) проходит через существующий candidate-test-harness.

## 0.66.0

### Minor Changes

- 087e254: feat(deriveProjections): R3c — read-only detail для catalog без mutator'ов

  До fix'а R3 генерил `<entity>_detail` только когда `|mutators(E)| > 1`.
  Сценарий из Fold shop:

  - customer.canExecute = [list_book, add_to_cart, ...]
  - host (runtime) фильтрует INTENTS по canExecute ДО crystallize
  - Book остался с единственным list_book (read) — R1b генерит
    read-only catalog (Book referenced by CartItem.bookId)
  - R3 skip: mutators = 0 → нет book_detail → onItemClick = NONE

  Клик по карточке книги у customer'а был мёртвый, у staff работал
  (staff имеет update_book + delete_book → mutators > 1 → R3).

  ## Fix

  Новая ветка R3c в deriveProjections:

  ```js
  if (mutatorCount > 1) {
    // R3: editable detail (как раньше)
  } else if (projections[`${lower}_list`]) {
    // R3c: read-only detail — catalog есть, mutators нет
    projections[`${lower}_detail`] = {
      kind: "detail",
      readonly: true,
      idParam: `${lower}Id`,
      derivedBy: [witnessR3cReadOnlyDetail(entityName, source)],
    };
  }
  ```

  - `readonly: true` — renderer скрывает edit/delete CTA-toolbar
  - `idParam: <entity>Id` — ArchetypeDetail резолвит target из routeParams
  - `witness.ruleId = "R3c"` — явный след для debug

  R3b (singleton my\_\*\_detail) теперь skip'ит read-only base — он даёт
  owner-scoped edit surface, без mutator'ов бессмыслен.

  ## Covered cases (+3 new tests)

  - R1b catalog (referenced entity без creators) → R3c read-only detail
  - R1 catalog с 1 creator (create-only domain) → R3c read-only detail
  - R3 (writable) срабатывает как раньше когда mutators > 1 — R3c не мешает

## 0.65.0

### Minor Changes

- 8ca3bb6: fix(datagrid): ActionCell фильтрует actions по per-row conditions

  catalog-default-datagrid pattern собирал actions-column из item.intents,
  но терял `conditions` (buildItemConditions populated с precondition +
  ownership + phase-check). Следствие: кнопка «Оплатить» оставалась в
  меню заказа, даже когда status уже paid.

  - core/catalog-default-datagrid: propagates `conditions` в action spec
  - renderer/DataGrid ActionCell + ActionMenu: фильтрует actions по
    `evalIntentCondition(c, item, ctx.viewer)` как это делает Card
    (containers.jsx). Пустой/отсутствующий conditions = всегда показ
    (backward-compat).

  +6 тестов: visible/hidden по статусу, multiple AND, mixed visibility,
  fallback на «—» когда все actions отфильтрованы.

## 0.64.0

### Minor Changes

- cf2a24a: `detail.editBodyOverride` → `<id>_edit.bodyOverride` (G-K-12 Keycloak).

  Раньше только `<entity>_create` projection с `mode: "create"` + `bodyOverride` получал custom layout (TabbedForm / Wizard / etc). Synthesized `<id>_edit` projection из `formGrouping.generateEditProjections` игнорировал `bodyOverride` и всегда рендерил flat formBody — `row-CTA "Изменить"` давал default UI даже когда create использовал tabbedForm.

  Теперь author может задать `editBodyOverride` на detail-projection:

  ```js
  client_detail: {
    kind: "detail",
    mainEntity: "Client",
    idParam: "clientId",
    editBodyOverride: {
      type: "tabbedForm",
      tabs: [
        { id: "settings", title: "Settings", fields: [...], onSubmit: { intent: "updateClient" } },
        ...
      ],
    },
  },
  ```

  `generateEditProjections` копирует `editBodyOverride` в синтезированный `client_detail_edit` как `bodyOverride`. Renderer `ArchetypeForm` видит `body.type === "tabbedForm"` и делегирует в `TabbedForm` primitive (idf-sdk#263) / Wizard (idf-sdk#240).

  ## Conservative

  - Non-object `editBodyOverride` игнорируется (paranoia guard)
  - Explicit author'ский `<id>_edit` projection всё ещё wins (existing behavior — `if (PROJECTIONS[editProjId]) continue`)
  - Без `editBodyOverride` — default flat formBody (back-compat)

  ## Tests

  `formGrouping.test.js` +3:

  - editBodyOverride → synth bodyOverride wizard-spec
  - без override — bodyOverride undefined
  - non-object paranoia guard

  `@intent-driven/core`: **1296 passed**.

  ## Use-case Keycloak

  Client.detail теперь может иметь same TabbedForm в edit-mode как в create через `editBodyOverride: clientCreateTabsSpec`. UI консистентен между «Создать client» wizard и row-action «Изменить client» — те же 5 tabs, те же поля.

## 0.63.0

### Minor Changes

- 98cca3b: normalizeIntentNative compiles `intent.precondition` (author-friendly object-shape) в `particles.conditions` (canonical string-form). Закрывает gap между тем как Claude/PM пишут спеку и чем оперирует SDK — buildItemConditions, evalIntentCondition.

  Формат: `{ "Entity.field": "val" | ["v1"] | ["v1","v2"] | true | false | number | null }` → `"Entity.field = 'val'"` / `"Entity.field IN ('v1','v2')"`. Невалидные LHS (без точки) — skip.

  Мерджится с existing `particles.conditions`, deduplicates.

## 0.62.0

### Minor Changes

- b834a6c: Fix G-K-26 (Keycloak post-final): hierarchy-tree-nav был промоушен
  слишком aggressively — match'ился на любой FK-chain ≥3 уровней
  (e-commerce Category→Product→LineItem, Realm→Client→ClientScope,
  Workflow→Node→NodeResult), и `structure.apply` ВСЕГДА инжектил
  treeNav в `slots.sidebar` без author-signal.

  **Тightening (b)** — trigger требует **realный hierarchy signal**:

  - Self-reference: поле с `references === entity` (parentId, managerId,
    replyToId) — настоящие nested-records того же типа, ИЛИ
  - Explicit `entity.hierarchy: true` declaration

  Старое sub-entity-exists requires заменено на `self-reference-or-explicit`.
  Новый schema-kind в `VALID_KINDS`.

  **Opt-in apply (c)** — match emits witness, но `structure.apply`
  инжектит treeNav в sidebar **только если**:

  - `ontology.features.hierarchyTreeNav: true` (domain-wide), ИЛИ
  - `projection.patterns.enabled.includes("hierarchy-tree-nav")` (per-projection)

  Без author opt-in apply NO-op (witness still emitted в matchedPatterns).

  **Falsification обновлён:**

  - `shouldMatch`: filesystem (Folder.parentId), groups (Group.parentId),
    explicit hierarchy:true
  - `shouldNotMatch`: workflow без self-ref, e-commerce category-product,
    Keycloak Realm→Client→Scope (was over-matched до G-K-26)

  Discovered в Keycloak dogfood-спринте 2026-04-23 — treeNav-mess в
  sidebar когда Realm не имеет realm.parentId (independent CRUD entities,
  не recursive). Также гасит false-positive matches в любом домене с
  deep FK-chain без настоящей иерархии.

  9 unit-tests + falsification обновлён + core suite 1293/1293 green.

## 0.61.0

### Minor Changes

- 076f475: Fix G-K-12: для α=replace intents formModal overlay подхватывает
  authored `<entityLower>_edit.bodyOverride` (если задекларирован) —
  позволяет author'у определить edit-flow через Wizard / TabbedForm
  primitive вместо flat parameters list.

  Без этого fix Stage 5 wizards в Keycloak (realm/client/IdP) работали
  только для CREATE flow (через hero `createX`), а EDIT через row-action
  ✎ показывал flat formModal с parameters list.

  Изменения:

  - `controlArchetypes::formModal.build` — новый helper
    `lookupEditBodyOverride(intent, context)` для α=replace intents
    смотрит `context.projections[<entityLower>_edit].bodyOverride` и
    передаёт на `overlay.bodyOverride`.
  - `assignToSlots` / `assignToSlotsCatalog` / `assignToSlotsDetail` —
    signature расширен `opts.projections` для прокидывания allProjections.
  - `crystallize_v2::index.js` — два call site (catalog/detail body +
    views expansion) передают `allProjections` через opts.

  Backward-compat: opts default `{}`, без `projections` в context —
  fallback на старое (только parameters). Existing domains не аффектированы.

  Renderer FormModal должен подхватить `spec.bodyOverride` для dispatch
  на Wizard / TabbedForm primitive — отдельный follow-up PR в renderer.

  5 unit-tests + core suite 1277/1277 green.

## 0.60.0

### Minor Changes

- c50a3db: Fix G-K-22: новый `ontology.features.preferDataGrid` switch для
  catalog-default-datagrid pattern. Closes admin-CRUD use-case где
  host-author хочет таблицу но catalog-action-cta уже добавил
  per-row intents → pattern avoid'ит trespass и оставляет card-list.

  Default behavior unchanged: `body.item.intents.length > 0` →
  catalog-default-datagrid skip apply (card-with-actions wins).

  Switch behavior (`ontology.features.preferDataGrid: true`):

  - Skip card-with-actions guard
  - Synthesize DataGrid + actions-column из `body.item.intents`
  - Format conversion: catalog-action-cta `{intentId, opens, overlayKey, icon}`
    → ActionCell `{intent, label, params, danger}`
  - Auto-label: `update*` → "Изменить", `remove*` → "Удалить",
    `read*` → "Открыть"
  - ActionCell auto-detect form-confirmation (G-K-24, #267) → openOverlay сама
  - `danger:true` для remove\* (red)

  Discovered в Keycloak dogfood-спринте 2026-04-23 — host workaround
  (9 manual `bodyOverride: dataGridBody(...)` declarations в
  `keycloak/projections.js`) можно удалить через
  `ontology.features.preferDataGrid: true` + ontology.witnesses
  (уже задекларированы для всех catalog'ов).

  Backward-compat: existing domains (Gravitino / freelance / sales) —
  default unchanged.

## 0.59.1

### Patch Changes

- 2676b22: Follow-up к G-K-20 (#257): `mergeEntityFieldsForReplace` использовал
  `control: "checkbox"` для boolean полей, но `KNOWN_PARAMETER_TYPES` в
  `validateArtifact` его не содержит — генерилось 200+ validation
  warnings на Keycloak baseline.

  Fix: использовать `control: "boolean"` (KNOWN). Семантически
  эквивалентно — renderer ParameterControl интерпретирует одинаково.

## 0.59.0

### Minor Changes

- 2e2a263: Fix G-K-20: для α=replace intents `formModal` overlay теперь включает
  `entity.fields` (editable parameters сущности) в дополнение к
  path-params из `intent.parameters`. Без этого update-form показывал
  только идентификаторы (`{realm, groupId, realmId}`) и не редактировал
  настоящие поля (`name`, `description`, `path`, `attributes` и т.п.).

  `wrapByConfirmation` signature расширен:

  ```js
  wrapByConfirmation(intent, intentId, parameters, { projection, ontology });
  ```

  `controlArchetypes::formModal.build` для α=replace intents merge'ит
  `ontology.entities[mainEntity].fields` в `overlay.parameters`:

  - system fields (`id`, `createdAt`, `updatedAt`, `deletedAt`) — skip
  - duplicates с path-params — skip
  - enum fields → `control: "select"` + options
  - boolean → `control: "checkbox"`
  - datetime/date → `control: "datetime"`
  - textarea → `control: "textarea"`
  - остальное — text input

  3 caller'а в `assignToSlots*` обновлены передавать `ontology: ONTOLOGY`
  в context. Без `ontology` в context — fallback на старое поведение
  (только parameters), backward-compat.

  Discovered в Keycloak dogfood-спринте 2026-04-23 (G-K-20). updateGroup
  modal показывал {Realm, Group Id, Realm Id} вместо real Group fields
  (name, path, description, subGroupCount, attributes).

  6 unit-tests + full core suite 1272/1272 green.

## 0.58.2

### Patch Changes

- ff69fd3: R8 absorbHubChildren: best-parent heuristic для multi-parent child'ов (G-K-11).

  Раньше child-catalog с FK на нескольких parent'ов absorbed в первого встреченного parent'а (зависит от порядка `Object.entries(detailByEntity)`). Для synthetic path-FK это даёт случайные hierarchy: `User.list` мог уйти в `role_detail` вместо `realm_detail` просто потому, что Role processed earlier.

  Новый алгоритм — «hubbier wins»:

  1. Собираем initial candidates per parent, parent'ы с <`HUB_MIN_CHILDREN` отбрасываются до competition
  2. Для каждого child-catalog выбираем parent'а с maximum candidates.length. Tiebreak — alphabetical по parentEntity (stable)
  3. Parent'ы, потерявшие child'ов ниже threshold после redistribution, skipped — их child'ы остаются root-catalog'ами (честнее, чем half-absorbed hub)

  Эффект: для Keycloak `user_list.absorbedBy = realm_detail` (Realm — 10 children) вместо `role_detail` (Role — 1 child после redistribution). Nav hierarchy семантически корректна.

  Author-override `projection.absorbed: false` и single-parent случаи работают как раньше (back-compat).

## 0.58.1

### Patch Changes

- 588763b: `detectForeignKeys` распознаёт `kind: "foreignKey"` + `references` маркер (G-K-9 follow-up).

  OpenAPI-importer кладёт FK как `type: "string"` + `kind: "foreignKey"` + `references: "Entity"` + `synthetic: "openapi-path"`. Раньше `detectForeignKeys` искал только `type === "entityRef"` — все path-derived FK из Keycloak/Gravitino-импортов были невидимы для downstream R2/R4/R8.

  Эффект: R8 hub-absorption теперь автоматически срабатывает для entity с ≥2 child'ами через explicit FK-marker. В Keycloak host это даёт schлопование 10 → 4-5 nav-tab'ов (User/Client/Group/Role/ClientScope/Component абсорбируются в `realm_detail` как hubSections).

  `references`-field резолвится case-insensitive, чтобы `references: "identityprovider"` тоже дошло до canonical `IdentityProvider`. Broken marker'ы (kind без references) молча игнорируются — fallback на существующую entityRef-ветку.

## 0.58.0

### Minor Changes

- daf8b94: Form-архетип поддерживает `projection.bodyOverride` (G23, Keycloak Stage 5).

  По образцу catalog-архетипа, author может задать authored body-node, который целиком заменяет derived formBody. Используется для замены flat-formBody на authored wizard-spec:

  ```js
  realm_create: {
    kind: "form",
    mode: "create",
    mainEntity: "Realm",
    creatorIntent: "createRealm",
    bodyOverride: {
      type: "wizard",
      steps: [
        { id: "basic", title: "Basic info", fields: [...] },
        { id: "login", title: "Login settings", fields: [...] },
      ],
      onSubmit: { intent: "createRealm" },
    },
  },
  ```

  Без `bodyOverride` form-archetype рендерится как раньше через derived `formBody` (back-compat). Работает и в `create`, и в `edit` режимах. Пустые slot'ы (header/toolbar/context/fab/overlay) сохраняются.

  Unblocks Wizard primitive для pattern `multi-step-create-wizard` (Gravitino/Keycloak): теперь authored projection может задавать step-by-step decomposition одного create-intent'а с большим количеством полей.

## 0.57.1

### Patch Changes

- 85bf78e: Fix: `crystallizeV2` теряет `mainEntity` и `entities` в построенных
  артефактах. Это ломает downstream R8 hub-absorption host-side checks
  и любую host-логику, которая фильтрует/группирует artifacts по
  `mainEntity` (materializers document/voice/agent, host nav-graph
  обогащение, custom hubSections без проброса проекций).

  Repro:

  ```js
  const artifacts = crystallizeV2(intents, projections, ontology);
  artifacts.user_detail.mainEntity; // === undefined ❌ должно быть "User"
  ```

  Fix: artifact builder теперь прокидывает `mainEntity: proj.mainEntity ||
null` и `entities: proj.entities || (proj.mainEntity ? [proj.mainEntity]
: [])`. `null` для projections без mainEntity (form/dashboard/canvas).

  Discovered в Keycloak dogfood-спринте 2026-04-23. Без этого fix'а R8
  hub-absorption не срабатывает на host-side для domain'ов где Realm/parent
  имеет ≥2 child catalog'ов (User/Group/Role/Client/...) с FK references.

## 0.57.0

### Minor Changes

- c3b3621: Промоция 3 stable-паттернов из Gravitino candidate bank (PR #229):

  - `detail/lifecycle-gated-destructive` — two-phase delete (disable → remove). Apply кладёт gate в `slots.actionGates` с `blockedWhen`-expression. Trigger: enum-status с ≥2 опций ИЛИ boolean-lifecycle поле, + парные disable/remove intents.
  - `catalog/inline-chip-association` — m2m chip+X inline в catalog row. Apply добавляет запись в `slots.rowAssociations` per junction (assignment-kind + парные attach/detach intents).
  - `detail/reverse-association-browser` — на detail reference-entity секция «кто ссылается». Apply добавляет `sections` `kind: "reverseM2mBrowse"` с автоматическим `groupBy` для polymorphic junctions (`objectType` / `entityType` / `kind`).

  Stable count: 33 → 36.

### Patch Changes

- c3b3621: pattern-bank: 11 candidate'ов из Apache Gravitino WebUI v2 (detail / catalog паттерны: lifecycle-gated-destructive, inline-chip-association, reverse-association-browser, cascading-dropdown-multiadd, composite-type-input-builder, multi-step-create-wizard, discriminator-filter-toolbar, readonly-system-managed-projection, template-instantiation-split-panel, properties-popover-on-count, inline-verification-action). Регенерирован candidate/manifest.js (PR #226).
- c3b3621: Рендер-интеграция 3 Gravitino-паттернов (PR #230):

  - `ArchetypeDetail` прокидывает `slots.actionGates` в ctx; `IntentButton` читает gate'ы по `spec.intentId`, eval'ит `blockedWhen` против target → disabled + tooltip. Click по disabled — no-op.
  - `ArchetypeCatalog` прокидывает `slots.rowAssociations` в ctx; `DataGrid` автоматически инжектит chip-column per association (перед actions), `ChipCell` резолвит junction-records + других entity + рендер через `ChipList` с attach/detach.
  - `SubCollectionSection` получает fallback для `source: "derived:<id>"` — collection-key берётся из `section.collection` или pluralized `section.itemEntity`. Pattern `reverse-association-browser` теперь корректно отображает referrer-items на reference-entity detail.

  Core (patch): у `reverse-association-browser` section дополнительно выставляется `itemEntity` и `collection` (pluralized, с учётом `entity.collection` override'а).

## 0.56.0

### Minor Changes

- ce2ee75: Promote `catalog-default-datagrid` из candidate → stable с `structure.apply`.

  **Host impact:** CRUD-admin catalog-проекции без visual-rich signals (image/multiImage/≥3 money-percentage-trend metrics) автоматически рендерятся как tabular DataGrid. **Автор больше не пишет `bodyOverride.columns` руками** — `catalog-default-datagrid.apply` выводит columns из `projection.witnesses` + `ontology.field.type/values`:

  - `string` / `text` → sortable + filterable (text input)
  - `enum` / `field.values` → sortable + `filter: "enum"` с `values`
  - `boolean` → sortable + `filter: "enum" [true, false]`
  - `number` / `decimal` / `int` → sortable
  - `image` / `multiImage` / `json` / `richText` / `fieldRole: heroImage|avatar` → skipped

  ### Apply precedence (respects earlier patterns & author-override)

  Pattern **no-op** если:

  - `slots.body.type === "dataGrid"` (author или earlier pattern уже задал)
  - `slots.body.layout === "grid"` (grid-card-layout сработал — visual-rich entity)
  - `projection.bodyOverride` present (author-level override)
  - `slots.body.item.intents.length > 0` (catalog-action-cta / другой pattern owns body)

  ### Host migration (optional — pattern работает автоматически)

  Было:

  ```js
  metalake_list: catalog("Metalake", "Metalakes", ["name", "comment"], {
    columns: [
      { key: "name",    label: "Name",    sortable: true, filterable: true },
      { key: "comment", label: "Comment", filterable: true },
    ],
  }),
  ```

  Стало (достаточно):

  ```js
  metalake_list: catalog("Metalake", "Metalakes", ["name", "comment"]),
  ```

  Результирующий `slots.body.type: "dataGrid"` с авто-выведенными columns — pattern apply.

  ### Tests

  - 1218 core tests (+21: 21 для нового stable pattern: trigger.match 7 + structure.apply 6 + helpers 7 + нехватка +id/curated-count fix)
  - 410 renderer
  - 45 adapter-antd
  - 33 stable patterns loaded (+1 — catalog-default-datagrid)
  - curated bank reduced to 6 (catalog-default-datagrid promoted)

## 0.55.2

### Patch Changes

- 2bae0d3: DataGrid `col.actions` display modes + row-contextual-actions-menu pattern.

  ## col.display: "inline" | "menu" | "auto"

  `col.kind:"actions"` теперь поддерживает **display mode**:

  - `"inline"` — все кнопки в ряд (legacy, без изменений)
  - `"menu"` — kebab (`⋯`) или gear (`⚙`, через `col.icon:"gear"`) trigger открывает dropdown
  - `"auto"` (default) — inline если `actions.length <= 2`, иначе menu

  **Motivation (Gravitino dogfood 2026-04-23, user observation):**

  > "шестерёнка вызывает контекстное меню с действиями, возможными к выполнению для сущности в row"

  3+ actions per row перегружают визуально admin-таблицы. AntD Pro ProTable / Stripe Dashboard / GitHub PR list / K8s Lens — все дефолтят на dropdown при ≥3 actions.

  ### Example

  ```js
  {
    key: "_actions",
    label: "Actions",
    kind: "actions",
    display: "menu",        // or "auto"
    icon: "gear",           // "⋯" default, "⚙" если icon:"gear"
    menuLabel: "Row actions",
    actions: [
      { intent: "editUser", label: "Edit", params: { id: "item.id" } },
      { intent: "duplicateUser", label: "Duplicate", params: { id: "item.id" } },
      { intent: "grantRoleToUser", label: "Grant Role", params: { user: "item.name" } },
      { intent: "deleteUser", label: "Delete", params: { id: "item.id" }, danger: true },
    ],
  }
  ```

  **Keyboard:** AntD Dropdown — native ARIA menu + keyboard. SVG-fallback — Enter / Escape / click-outside.

  ## Pattern: row-contextual-actions-menu

  Новый curated candidate (catalog-archetype, matching-only). Документирует когда inline → menu rewrite уместен.

  Field evidence:

  - Apache Gravitino v2 WebUI (user observation 2026-04-23)
  - AntD Pro ProTable (`actionRef` ellipsis column)
  - Stripe Dashboard (customers / invoices / subscriptions)
  - GitHub PR/issues lists
  - Linear / Height / Notion database rows
  - K8s Lens / Rancher

  **Tests:**

  - 410 renderer (+8: 6 display-mode, 1 gear icon, 1 disabled-in-menu)
  - 45 adapter-antd
  - 1201 core (+4: 7 curated candidates + id-uniqueness)

## 0.55.1

### Patch Changes

- d78680b: Pattern bank: новый curated candidate `catalog-default-datagrid`.

  **Observation (Gravitino dogfood 2026-04-23):** catalog-archetype без image/multiImage и без ≥3 money/percentage/trend metrics по умолчанию рендерится как grid карточек (legacy fallback), хотя в admin/CRUD surface (metalakes / roles / policies / users / customers / invoices) пользователь ожидает tabular DataGrid с per-column sort/filter. Field research подтверждает: Gravitino v2 WebUI, Stripe Dashboard, AntD Pro, K8s Lens/Rancher, Linear admin — все дефолтят на табличный layout в CRUD-админке.

  **Complements** `grid-card-layout` (visual-rich feeds): apply order между двумя паттернами даст grid-card-layout приоритет когда срабатывает его trigger, иначе — catalog-default-datagrid.

  **Matching-only в этом релизе** — `structure.apply` deferred. Перед promotion в stable:

  1. Интеграция с crystallize_v2 synthesized bodyOverride (pattern должен заменять slots.body на `type: "dataGrid"` без ломания author-override через `projection.bodyOverride`)
  2. Composition с `catalog-action-cta` (если в intent-каталоге есть inline actions — добавлять action-column)
  3. Falsification batch против invest/sales/messenger/reflect (shouldNotMatch) + gravitino/compliance/Stripe-like domains (shouldMatch)

  **Tests:** 6 curated candidates (+1 к существующим 5), все проходят validatePattern + registry-integration.

## 0.55.0

### Minor Changes

- 0153d20: Authored `projection.bodyOverride` в catalog-архетипе — полная замена derived body-node.

  **Use-case:** Gravitino catalog_list хочет DataGrid primitive с явными columns (sort/filter per column) вместо default card-list. До этого fix'а — crystallize игнорировал authored `body` в projection и всегда строил card-list через `buildCatalogBody`.

  **Shape:**

  ```js
  PROJECTIONS.catalog_list = {
    kind: "catalog",
    mainEntity: "Catalog",
    entities: ["Catalog"],
    bodyOverride: {
      type: "dataGrid",
      items: [],   // runtime-filled renderer'ом из world
      columns: [
        { key: "name",     label: "Name",     sortable: true, filterable: true },
        { key: "type",     label: "Type",     filter: "enum", values: [...] },
        { key: "provider", label: "Provider", sortable: true },
      ],
      onItemClick: { action: "navigate", to: "catalog_detail", params: { catalogId: "item.id" } },
    },
  };
  ```

  **Поведение:**

  - `projection.bodyOverride` (object) → `slots.body = projection.bodyOverride` без модификаций
  - Strategy post-processing (shape / itemLayout / emphasisFields / aggregateHeader / extraSlots / cardSpec) — **skipped** для authored bodyOverride. Автор декларирует rendering explicitly, SDK не полирует.
  - `slots.body.item.intents = itemIntents` — также skipped (авторский body сам декларирует interactions через `onItemClick` и т.п.)
  - Без `bodyOverride` — old behavior: `buildCatalogBody(projection, ONTOLOGY)` + все strategy-mutations.

  **Parallel к projection.subCollections** (backlog §16 author curation) — authored curation поверх derivation: автор знает что декларирует, SDK respects.

  **Tests:** +3 unit в `assignToSlotsCatalog.test.js`. 1190/1190 core pass.

  **Closes:** Gravitino G20/G21/G38 (chip columns + Type/Provider filter + column filters) через host-level authoring catalog_list.bodyOverride.

## 0.54.0

### Minor Changes

- 8647f82: `normalizeIntentNative` теперь synthesize'ит `intent.creates` и `particles.effects` из flat-format (`α + target`), который эмитят scaffold-path и LLM-авторинг (studio PM chat). Без этого `deriveProjections` на flat-intents видел creators/mutators пустыми и не выводил R1 catalog / R3 detail — UI оставался без проекций даже при полной онтологии.

  - `α: "create"` + `target: "Task"` → добавляет `creates: "Task"` и `particles.effects: [{ target: "Task", op: "create", α: "create" }]`.
  - Любой `α + target` → добавляет соответствующий effect (`op: α`).
  - Если автор уже задал `intent.creates` или `particles.effects` — не перезаписываем.

  Host-workaround `enrichIntentsForDerive` в idf-studio можно удалить после bump'а.

## 0.53.0

### Minor Changes

- a06e7e6: Declarative `field.primitive` hint на уровне ontology — перекрывает role/type-based detail-body inference для custom primitives.

  **Use-case:** Gravitino `Table.columns` (type: "json") рендерился как infoSection entry с bind'ом на raw JSON blob. После fix'а автор декларирует:

  ```js
  Table: {
    fields: {
      name: { type: "string", role: "primary-title" },
      columns: { type: "json", primitive: "schemaEditor" },  // ← hint
    },
  }
  ```

  → `detail.slots.body` получает standalone atom `{ type: "schemaEditor", bind: "columns", label: "columns" }` после обычных role-based секций. Renderer PRIMITIVES map resolves "schemaEditor" → рендер через SchemaEditor primitive (или через adapter, если capability registered).

  **Generic механизм:** работает для любого primitive из PRIMITIVES — `schemaEditor`, `map`, `chart`, `treeNav`, `breadcrumbs`, etc. Field-level override вместо projection-level — cleaner authoring.

  **Scope:**

  - Fields с `primitive` hint pull'ятся из role-based grouping, emit'ятся как standalone atoms после основных секций detail-body.
  - `label` прокидывается в primitive props (использующие primitives — оставляют, не использующие — игнорируют).
  - Backward compat: fields без hint идут обычным путём (role/type heuristic).

  **Tests:** +3 unit в `assignToSlotsDetail.test.js` — schemaEditor override, back-compat без hint, arbitrary primitive name (map). 1187/1187 core pass.

  **Related:** Gravitino dogfood-спринт Stage 3 Task 3 (host-integration SchemaEditor для Table.columns) — после merge этого PR + bump host ontology annotate Table.columns.primitive.

## 0.52.1

### Patch Changes

- 1d7cb5c: `subcollections` pattern apply теперь возвращает render-ready section shape.

  До этого auto-derived sections имели thin-shape:

  ```js
  { id, entity, foreignKey, layout, intents, source: "derived:subcollections" }
  ```

  Renderer ожидает `{title, itemEntity, itemView, itemIntents}` (как у `buildSubSection` в `assignToSlotsDetail.js`) — получал `undefined`, рендерил пустые заголовки + unknown-entity списки. Регресс виден на Gravitino: `user_detail` / `role_detail` / `group_detail` имели sections с пустыми headers.

  Fix: `buildSection` в `subEntityHelpers.js` теперь добавляет:

  - `title` — humanized entity name (`OrderItem` → `"Order item"`)
  - `itemEntity` — alias для `entity` (renderer-preferred name)
  - `itemView` — minimal text-bind на primary-title поле (с fallback на `name`/`title`/`label`, потом `id`)
  - `itemIntents` — alias для `intents`
  - `emptyLabel` — default `"Пока пусто"`

  Backward compat: legacy `entity`/`intents` поля сохранены (удалим в major). Author override через `projection.subCollections` — этот path вообще не изменился.

  **Обнаружено:** Gravitino dogfood-спринт 2026-04-23 Stage 2 Task 1 discovery (docs/gravitino-gaps.md G14 / ux-patterns-notes P-3).

  **Tests:** +3 unit (title/itemEntity/itemView populated, fallback на id, humanize multi-word). 1184/1184 core tests pass.

## 0.52.0

### Minor Changes

- 6b2abac: **heroCreate multi-param filter + Badge sx + witness alignSelf** (backlog §9.10 – §9.12, post-merge follow-up to #179).

  Три SDK-гапа, не попавшие в первую волну workzilla post-bump fixes из-за squash-merge timing'а.

  ### §9.10 — `heroCreate` match отсекает multi-param creator'ов

  Existing check учитывал только `witnesses.length > 1`. Multi-field creator (создать Task — title / description / budget / categoryId / deadline / …) match'ился heroCreate-архетипом и рендерился как hero-input на одно поле — способа открыть полноценную форму не было. Автор вынужден был писать `control: "formModal"` explicit override.

  - Добавлен check по `userVisibleParams.length > 1` (считая `intent.parameters` и `particles.parameters`, исключая `id`). Multi-field creator'ы теперь уходят в formModal → catalog-creator-toolbar pattern (кнопка в toolbar + overlay с полной формой).

  ### §9.11 — `Badge` primitive пропускает `node.sx` в AdaptedBadge

  Раньше `<AdaptedBadge color={tone}>` не получал `node.sx`. AntD Tag внутри flex-column-родителя (`align-items: stretch` default) стретчился на всю ширину карточки — выглядит как полоса вместо тега.

  - Обёртка `<span style={{display: "inline-flex", ...node.sx}}>` — shrink-to-content + пробрасывает `alignSelf` / другие overrides к Tag'у.

  ### §9.12 — `witnessItemChildren` эмитит `sx.alignSelf` для compact primitives

  Badge / timer witness-дети автоматически получают `sx: {alignSelf: "flex-start"}`. Catalog-card layout перестаёт стретчить их на ширину карточки — даже если адаптер отсутствует и используется fallback span.

  ***

  **Тесты:** 2 expectation-update (`witnessItemChildren.test.js`) + фикс `nativeScaffold.test.js` (убран inconsistent `confirmation: "enter"` на 3-param creator'е — normalize инферит `"form"`). Core 1181 → 1181 green, renderer 297, adapter-antd 22.

  **Host-side impact:** после bump'а workzilla-clone сможет убрать:

  - `createTaskDraft.control: "formModal"` explicit override (heroCreate сам откажется).
  - `overrides.css` с `.ant-tag { align-self: flex-start }` (§9.11 делает то же через JSX).

## 0.51.0

### Minor Changes

- be56319: **Workzilla post-bump SDK fixes** (backlog §9.1 – §9.6).

  Пять SDK gap'ов, обнаруженных после релиза 0.50/0.26 при интеграции workzilla-clone. Закрыты одной волной.

  ### 9.1 — native `type: "string" / int / float` → canonical control

  `inferControlType` на строке 65 возвращал `param.type` напрямую, без `mapOntologyTypeToControl`. Importer-generated + scaffold авторы, использующие `type: "string"` (Prisma/OpenAPI vocabulary), получали `unknown parameter control type: "string"` в `validateArtifact`.

  - `mapOntologyTypeToControl` принимает `string → "text"`, `int/integer → "number"`, `float/double/bigint → "number"`, `bool → "select"`.
  - `inferControlType` применяет маппинг к explicit `param.type`.

  ### 9.2 — `deriveProjections` auto `idParam` на detail

  Standalone detail-projections (R3) получали `idParam: undefined`. ArchetypeDetail без `idParam` не мог достать target из `routeParams` — click по item в list давал EmptyState.

  - `projections.<entity>_detail.idParam = "<entityLower>Id"` (convention).
  - Singleton R3b (`my_<entity>_detail.singleton:true`) остаются без idParam (их владелец — viewer).

  ### 9.3 — `onItemClick` routing предпочитает matching mainEntity

  При ≥2 outgoing `item-click` edges из list-projection SDK выбирал первый по алфавиту — часто wrong entity. `task_list.onItemClick` уходил в `response_detail` вместо `task_detail`.

  - Prefer edge, у которого `toProj.mainEntity === fromProj.mainEntity`; fallback — alphabetical first.

  ### 9.4 — `ArchetypeForm` header адаптер-aware

  Navigation bar (← Отмена / title / Создать) был hardcoded iOS-glass (`backdropFilter: blur(20px)`, SF blue `#007aff`, SF font). Для AntD/Mantine-хостов — визуально чужеродно.

  - `getAdaptedComponent("shell", "formHeader")` — если адаптер предоставил, используется.
  - `getAdaptedComponent("button", "primary/secondary")` — fallback к адаптерным кнопкам в neutral-header.
  - `@intent-driven/adapter-antd` добавил `AntdFormHeader` (AntD Button + typography).
  - Neutral native fallback через CSS-vars (`--idf-primary / --idf-border`).

  ### 9.5 — `ArchetypeForm` `projection.name` guard

  Bare `{projection.name}` в header крэшил `Cannot read properties of undefined (reading 'name')` когда host не передавал `projection` prop. Теперь: `projection?.name ?? parentCtx?.artifact?.name ?? ""`.

  ### 9.6 — core exports для host-authored flows

  Ранее synthesized projections (`generateCreateProjections`, `buildCreateFormSpec`) были internal — host мог получить только артефакт, не projection definition. Теперь доступны top-level:

  ```js
  import {
    generateCreateProjections,
    buildCreateFormSpec,
    mapOntologyTypeToControl,
    normalizeIntentNative,
    normalizeIntentsMap,
  } from "@intent-driven/core";
  ```

  Host может использовать для custom debug / inspector / form-derivation без повторного вызова `crystallizeV2`.

  ***

  **Тесты:** 11 новых integration (`workzillaPostBump.test.js`). Core: 1170 → 1181.

## 0.50.0

### Minor Changes

- 6e3942a: **Form-archetype синтезируется из insert-intent'ов** (Workzilla dogfood findings P0-2, backlog §8.2).

  Раньше `generateEditProjections` создавал синтетические `*_edit` projection'ы только для replace-intent'ов (detail-based). Insert-intent'ы (`creates: X` / `α:"add"`) не получали form-проекции — автор/скаффолд был вынужден писать `{entity}_create` руками, иначе action-button «Создать задачу» в каталоге открывал пустоту.

  **Core:** `generateCreateProjections(INTENTS, PROJECTIONS, ONTOLOGY)` — scan'ит INTENTS по `intent.creates`, для каждого entity (первый insert-intent побеждает) создаёт:

  ```js
  {
    name: "Создать X",
    kind: "form",
    mode: "create",
    mainEntity: X,
    entities: [X],
    creatorIntent: <intentId>,
  }
  ```

  Author-override: если `PROJECTIONS["<entityLower>_create"]` уже существует — no-op. Вызывается в `crystallizeV2` entry рядом с `generateEditProjections`; результат мёржится в `allProjections` перед `absorbHubChildren`.

  **`buildCreateFormSpec`** строит fields из `intent.parameters` (после native-bridge normalize parameters array). Enrich: onto-label / onto.valueLabels для enum / required. SYSTEM_FIELDS (id / createdAt) пропускаются. Секционирование по `inferFieldRole` — тот же UX, что в edit-форме.

  **Renderer:** `ArchetypeForm` поддерживает `body.mode === "create"`:

  - Пропускает target-lookup (new row, не existing).
  - Initial values из `field.default` (или пустые).
  - Пропускает ownership check (owner проставляется сервером из viewer).
  - Save → `ctx.exec(creatorIntent, payload)` (вместо execBatch).
  - Button label → «Создать» (вместо «Сохранить»).

  Закрывает Workzilla acceptance: click по «Создать задачу» из catalog-creator-toolbar → переход на `task_create` → форма title/description/budget/categoryId/deadline.

- 6e3942a: **Native-format → legacy bridge в crystallizeV2** + новый stable pattern `catalog-action-cta` (Workzilla dogfood findings P0-1, backlog §8.1).

  Раньше native-format intent'ы (importer-postgres / -openapi / -prisma emit + scaffold-path авторы) не доходили до toolbar / item.intents в catalog и detail архетипах. Native-format:

  ```js
  {
    target: "Task",
    alpha: "replace",
    permittedFor: ["customer"],
    parameters: { id: { type: "string", required: true }, title: { type } },
    particles: { effects: [{ target: "Task", op: "replace" }] },
  }
  ```

  Crystallize_v2 читает `particles.entities`, `particles.effects[].α`, array-parameters — которых в native-format нет. Без них `appliesToProjection` проваливает intent как не-относящийся к mainEntity, `selectArchetype` возвращает null (нет `confirmation`), и UI-generation даёт пустой toolbar.

  **Нормализация `normalizeIntentsMap`** (`crystallize_v2/normalizeIntentNative.js`) применяется сразу после `sortKeys` в crystallizeV2 entry:

  1. `intent.target` → `particles.entities: ["<alias>: <Target>"]` (если пусто).
  2. `particles.effects[i].op` → `α` + target нормализация:
     - `op:"insert"` → `{α:"add", target: <plural lowercase>}`
     - `op:"replace"|"update"` → `{α:"replace", target: <lowercase>}`
     - `op:"remove"|"delete"` → `{α:"remove", target: <lowercase>}`
  3. `parameters: {obj}` → `parameters: [array]`.
  4. `particles.confirmation` инфер из α (только для native-intent'ов):
     - `α:"add"` → `"enter"` (composer / heroCreate)
     - `α:"replace"` → `"form"` если user-params > 0, иначе `"click"`
     - `α:"remove"` → `"click"`

  Normalization **additive-only**: legacy-intent'ы (с `particles.entities`, `effects[].α`) проходят через no-op. `normalizeIntentsMap` идемпотентно — повторный вызов возвращает тот же объект.

  **Stable pattern `catalog-action-cta`** (`patterns/stable/catalog/`):

  - Trigger: catalog с ≥1 replace-intent на mainEntity.
  - Apply: тагирует `body.item.intents` с `source:"derived:catalog-action-cta"` (matching/metadata — routing уже сделан в `assignToSlotsCatalog::isPerItemIntent`).
  - Назначение: формально фиксирует §8.1 acceptance + unlock Studio X-ray tracing.

  Stable-count: 31 → 32.

  **Интеграция-тесты:** `nativeScaffold.test.js` проверяет что Workzilla-like ontology (native-format intents) производит populated `item.intents` + `toolbar`. Закрывает Workzilla acceptance "editTask / publishTask видны customer'у в task_list".

- 6e3942a: **catalog: `projection.witnesses[]` strict rendering на flat-list** (Workzilla dogfood findings P0-3, backlog §8.3).

  Раньше `projection.witnesses` учитывался только в grid-layout'е (через `buildCardSpec` / `grid-card-layout` pattern). Для flat-list catalog'ов `item.children` были hardcoded в `buildCatalogBody`: avatar + title + subtitle — независимо от того, что автор задекларировал.

  Теперь: если `projection.witnesses` непустой массив и `layout !== "grid"`, `item.children` генерируются из witnesses через `inferFieldRole`:

  - `title` → `{ type: "text", style: "heading" }`
  - `money`/`price` → `{ type: "text", format: "currency", style: "money" }`
  - `badge` (status/enum/condition) → `{ type: "badge" }`
  - `heroImage` → `{ type: "avatar", size: 40 }` (уходит в row-left)
  - `timer`/`deadline` → `{ type: "timer" }` (inline countdown)
  - `timestamp`/`scheduled`/`occurred` → `{ type: "text", format: "datetime" }`
  - `metric` → `{ type: "text", format: "number" }`
  - `description` → `{ type: "text", style: "secondary" }`
  - `location`/`address`/`zone` → `{ type: "text", style: "secondary" }`
  - fallback → `{ type: "text" }`

  **Renderer:** `Text` primitive расширен: `format: "currency"` → `n.toLocaleString("ru") + " ₽"`. `STYLE_PRESETS` получил `money` (teal weight 600). Полное vocabulary (`money-positive`/`money-negative`/`badge-*`) — на 8.5.

  **Back-compat:** `projection.witnesses` пустой или не задан → legacy avatar+title+subtitle fallback. Grid-layout по-прежнему идёт через `buildCardSpec` (не заменяется).

  Закрывает Workzilla-clone acceptance «`task_list.witnesses = ["title","budget","deadline","status"]` → card показывает 4 поля корректным primitive'ом».

## 0.49.0

### Minor Changes

- 434de69: patterns/optimistic-replace-with-undo: добавлен `structure.apply(slots, context)`.

  Паттерн triggers на ≥3 replace-click intents без `irreversibility:high/extreme` и emit'ит `{type:"undoToast", intentId, inverseIntentId, windowSec, message?}` в `slots.overlay` для каждого candidate'а с явным `inverseIntent` / `antagonist`. Shape совместим с `undo-toast-window` — primitive `UndoToast` (renderer) рендерит обе формы одинаково; overlap между паттернами защищён идемпотентностью по `intentId`. Respects `projection.undoToast === false`, `intent.undoable === false`, overrides `intent.undoWindowSec` / `projection.undoWindowSec` (default 5 сек).

  После этого изменения остаются 2 matching-only паттерна из 31 stable: `global-command-palette`, `keyboard-property-popover`.

## 0.48.0

### Minor Changes

- a17e236: Role-aware projection filtering — `projection.forRoles` (backlog §4.9).

  Projection author декларирует `forRoles: ["customer", "executor"]` — проекция
  видима только viewer'ам с матчинг-активной ролью. Без `forRoles` — видима всем
  (backward-compat).

  **API:**

  - `filterProjectionsByRole(ids, projections, activeRole)` → filtered ids
  - `isProjectionAvailableForRole(projection, activeRole)` → boolean
  - `partitionProjectionsByRole(ids, projections, activeRole)` → `{visible, hidden}`

  **Freelance применение:** `my_tasks` → `forRoles:["customer"]`, `my_responses` →
  `forRoles:["executor"]`, `my_deals` / `wallet` → `forRoles:["customer","executor"]`.
  Host-сайд (V2Shell) применяет filter к `domain.ROOT_PROJECTIONS` после смены
  `activeRole` — tab-bar реально меняется.

  **Семантика:** declarative visibility над `activeRole` (session-scoped), не над
  `role.base` (permission-scoped). Role.base фильтрует что viewer может делать;
  forRoles фильтрует что viewer сейчас видит в nav.

## 0.47.1

### Patch Changes

- 8a43a88: feat(patterns): formalization apply для 5 patterns (hero-create, phase-aware-primary-cta, antagonist-toggle, composer-entry, inline-search).

  **Формализационный batch** — apply'и, которые не изменяют SDK-логику маршрутизации intent'ов в слоты (она уже реализована в `assignToSlots*` + archetypes), а **маркируют** результирующие slot-элементы с `source: "derived:<pattern-id>"`. Renderer может opt-in в pattern-specific styling.

  Плюс `antagonist-toggle` эмитит `slots._toggles: [{a, b}]` — ранее этой metadata не было, пары ранее коллапсились только в overflow.

  ### hero-create

  `slots.hero[heroCreate].source = "derived:hero-create"` (формализация existing SDK catalog heroCreate routing).

  ### phase-aware-primary-cta

  `slots.primaryCTA[*].source = "derived:phase-aware-primary-cta"` (формализация existing SDK detail phase-transition routing). Не перетирает уже-заданный source.

  ### antagonist-toggle

  Новая metadata `slots._toggles = [{ a: "pin_message", b: "unpin_message" }, ...]` — pair detection via `intent.antagonist` cross-reference. Renderer может объединить пару в single toggle-button вместо двух отдельных. Dedup (A→B и B→A → одна запись).

  ### composer-entry

  `slots.composer.source = "derived:composer-entry"` (формализация feed composerEntry archetype).

  ### inline-search

  `slots.toolbar[inlineSearch].source = "derived:inline-search"` (формализация projection-level search archetype).

  ## Тесты

  - hero-create: 4 теста
  - phase-aware-primary-cta: 3 теста
  - antagonist-toggle: 6 тестов
  - composer-entry: 3 теста
  - inline-search: 3 теста
  - **Итого**: +19 core тестов. **1038 passing**.

  ## Roadmap progress

  Было 8 → **3** оставшихся stable patterns без apply (13/16 = 81%).

  Осталось:

  - `optimistic-replace-with-undo` (behavior-only, сложно encode declaratively)
  - `keyboard-property-popover` (renderer-heavy — новый primitive)
  - `global-command-palette` (renderer-heavy — ⌘K overlay)

  Тип `patch` — формализация не меняет runtime behavior, только маркирует metadata для renderer.

## 0.47.0

### Minor Changes

- e5262ec: feat(patterns): `structure.apply` для `vote-group` + `discriminator-wizard`.

  ## vote-group.apply

  Находит intents с `creates: "Entity(variant)"`, группирует по base entity, emit'ит `slots._voteGroups`:

  ```js
  slots._voteGroups = {
    Vote: [
      { intentId: "vote_yes", value: "yes", label: "Да" },
      { intentId: "vote_no", value: "no", label: "Нет" },
      { intentId: "vote_maybe", value: "maybe", label: "Может быть" },
    ],
    _source: "derived:vote-group",
  };
  ```

  Только группы с ≥2 variants попадают (singletons исключаются). Renderer (SubCollectionItem / ArchetypeDetail) может заменить дубль intent-buttons единой voteGroup-виджет.

  ## discriminator-wizard.apply

  Находит entity с discriminator field (`type` / `provider` / `kind` / `category`) с ≥2 select-options + create-intent, emit'ит `slots._wizardCandidates`:

  ```js
  slots._wizardCandidates = [
    {
      discriminatorField: "type",
      variants: ["hive", "iceberg", "kafka"],
      creatorIntentId: "create_catalog",
      source: "derived:discriminator-wizard",
    },
  ];
  ```

  Renderer может заменить обычный FormModal на multi-step wizard (step 1 — выбор variant, step 2+ — variant-specific поля).

  **Scope**: metadata-only в обоих apply. Полноценная UI-интеграция (voteGroup-widget, wizard-overlay) — future renderer work.

  ## Тесты

  - `vote-group.test.js` — **7 тестов**.
  - `discriminator-wizard.test.js` — **8 тестов**.
  - **1034 core** passing (+15).

  ## Roadmap progress

  Было 10 → **8** оставшихся stable patterns без apply (8/16 за 5 PR — **half way**).

## 0.46.0

### Minor Changes

- d6281b7: feat(patterns): `hierarchy-tree-nav.apply` + TreeNav primitive.

  ## core

  Pattern apply обходит ontology по FK-цепочке от `mainEntity` (BFS, depth-limit 5), строит tree metadata и prepend'ит `treeNav`-node в `slots.sidebar`:

  ```js
  sidebar: [
    {
      type: "treeNav",
      root: "Metalake",
      levels: [
        { depth: 0, entity: "Metalake", children: ["Catalog"] },
        { depth: 1, entity: "Catalog", children: ["Schema"] },
        { depth: 2, entity: "Schema", children: ["Table"] },
        { depth: 3, entity: "Table", children: [] },
      ],
      source: "derived:hierarchy-tree-nav",
    },
    // ...existing sidebar nodes
  ];
  ```

  Trigger (pattern spec): ≥3 уровня FK-цепочки (`mainEntity` → child → grandchild). Apply делает defensive-check — требует минимум 2 уровня.

  **Idempotent**: если `sidebar[0].type === "treeNav"` — no-op.

  ## renderer

  Новый primitive `TreeNav` (зарегистрирован в `PRIMITIVES.treeNav`):

  - Вертикальный список entities с `paddingLeft: depth * 14px` (визуальная иерархия).
  - Heading «Иерархия» + entity labels + counter для children.
  - Click по узлу → `ctx.navigate(<entity>_list, {entity})` с fallback на `<entity>_detail`.
  - Accessibility: `<nav aria-label="Hierarchy">` + `<button role="tab">`.

  Пока что: schema-preview (рендерит структуру, не runtime instances). Полноценная tree-навигация с expand/collapse по instances — future primitive.

  ## Тесты

  - `hierarchy-tree-nav.test.js` — **7 тестов** (BFS chain, idempotency, depth limit, witness).
  - `TreeNav.test.jsx` — **7 тестов** (render, padding, counter, navigation, aria).
  - **1026 core / 265 renderer** passing.

  ## Roadmap progress

  Было 11 → **10** оставшихся stable patterns без apply (6/16 за 4 PR).

## 0.45.0

### Minor Changes

- fd4e550: feat(patterns): `kanban-phase-column-board.apply` + renderer KanbanBoard.

  ## core

  Pattern apply устанавливает `slots.body.layout = { type: "kanban", columnField, columns, source }` на основе enum-options status-поля mainEntity.

  **Triggers**: entity с status-field ≥3 options + ≥1 replace-intent на `<entity>.status`.

  **Author-override**: существующий `body.layout` (string `"grid"` или object) → apply skip.

  ```js
  // Derived output:
  slots.body = {
    type: "list",
    source: "orders",
    layout: {
      type: "kanban",
      columnField: "status",
      columns: [
        { id: "draft", label: "Черновик" },
        { id: "active", label: "Активные" },
        { id: "done", label: "Готово" },
      ],
      source: "derived:kanban-phase-column-board",
    },
  };
  ```

  Поддерживает два формата options: `["draft", "active", ...]` (strings) и `[{value, label}, ...]` (objects). Также `entity.statuses` legacy shape.

  ## renderer

  `List` primitive детектит `layout.type === "kanban"` → рендерит `<KanbanBoard>` вместо обычного list/grid:

  - Горизонтальный flex-контейнер с `overflow-x: auto`.
  - Каждая колонка (flex-basis 260px) содержит заголовок (label + счётчик items) + список cards.
  - Items группируются по `item[columnField]`; unmatched items → последняя колонка.
  - Per-item `onItemClick` работает как обычно (navigate).
  - `data-column` атрибуты для e2e/test selectors.

  **Drag-to-replace-status** — TODO (HTML5 drag API + ctx.exec на replace-intent). Сейчас — group + click, без drag.

  ## Тесты

  - Core: **8 тестов** (`kanban-phase-column-board.test.js`).
  - Renderer: **6 тестов** (`listKanban.test.jsx`).
  - **1026 core / 264 renderer** passing.

  ## Roadmap progress

  Было 12 → **11** оставшихся stable patterns без apply.

## 0.44.0

### Minor Changes

- 50b1b8f: feat(patterns): `structure.apply` для `lifecycle-locked-parameters` + `bulk-action-toolbar`.

  ## lifecycle-locked-parameters.apply

  Если entity имеет status-field с active-state (active/running/confirmed/captured/accepted), добавляет секцию `lockedParameters` в `slots.sections`:

  ```js
  {
    id: "lockedParameters",
    title: "Параметры после активации",
    kind: "lockedParameters",
    entity: "Subscription",
    lockedWhen: "item.status === 'active'",
    fields: ["maxAmount", "scope", "endDate"],
    explainer: "Эти параметры фиксируются при активации и не могут быть изменены.",
    source: "derived:lifecycle-locked-parameters",
  }
  ```

  Locked-fields = targets всех replace-intents на `mainEntity.*` (кроме `status`). Renderer читает `lockedWhen`-выражение в runtime и переключает read-only view при match.

  ## bulk-action-toolbar.apply

  Если в intents ≥2 `bulk_*`-prefix id, добавляет `slots._bulkMode` metadata:

  ```js
  {
    enabled: true,
    actions: ["bulk_archive", "bulk_mark_read"],
    source: "derived:bulk-action-toolbar",
  }
  ```

  Renderer при `selection.length ≥ 1` активирует multi-select mode и показывает toolbar-bar с кнопками из `actions`.

  Idempotent (existing `_bulkMode` не перезаписывается). Pure function.

  ## Тесты

  - lifecycle-locked-parameters: 6 тестов (active-status detection + locked fields + idempotency + section preservation).
  - bulk-action-toolbar: 5 тестов (≥2 bulk intents + id-prefix filter + idempotency).
  - **1008 core passing** (+11 от 997).

  ## Прогресс roadmap

  Было 14 оставшихся stable patterns без apply (после PR #134); стало **12**.

  Следующие кандидаты: `vote-group`, `inline-search`, `antagonist-toggle`, `hero-create`, `phase-aware-primary-cta`, `composer-entry` (formalizaция), `discriminator-wizard`, `hierarchy-tree-nav`, `optimistic-replace-with-undo`, `keyboard-property-popover`, `global-command-palette`, `kanban-phase-column-board`.

## 0.43.0

### Minor Changes

- 0cf2da8: feat(patterns): `structure.apply` для `m2m-attach-dialog` + `observer-readonly-escape`.

  Два новых pattern.apply из roadmap «оставшиеся 17 stable patterns».

  ## m2m-attach-dialog.apply

  Находит assignment-entity с FK на `mainEntity` в ontology, добавляет секцию в `slots.sections`:

  ```js
  {
    id: "m2m_assignment",
    title: "Связанные Advisors",
    kind: "attachList",
    entity: "Assignment",
    foreignKey: "portfolioId",
    otherField: "advisorId",
    otherEntity: "Advisor",
    attachControl: { type: "attachDialog", multiSelect: true, otherEntity: "Advisor" },
    source: "derived:m2m-attach-dialog",
  }
  ```

  Renderer primitive `attachList` + `attachDialog` — TODO отдельный renderer PR. Текущий fallback — универсальный SlotRenderer (section rendering через card-children).

  Author-override: `projection.subCollections` (authored) → apply skip'ает.

  ## observer-readonly-escape.apply

  Если viewer имеет `role.base === "observer"` и ≥1 high-irreversibility intent в его `canExecute`, prepend'ит `readonlyBanner`-node в `slots.header`:

  ```js
  {
    type: "readonlyBanner",
    role: "auditor",
    escapeIntentIds: ["file_dispute", "flag_anomaly"],
    source: "derived:observer-readonly-escape",
  }
  ```

  Signal: "viewer-only mode с escape-путём" — renderer показывает badge "только просмотр" + inline reference на escape intents. Idempotent.

  ## Тесты

  - m2m: 8 тестов (trigger + apply + edge cases).
  - observer: 7 тестов (trigger + apply + idempotency).
  - **1013 core passing** (+16 от 997).

  ## Прогресс roadmap

  Было 16 оставшихся stable patterns без apply; стало 14.

## 0.42.0

### Minor Changes

- b558795: feat(projection): `projection.hero` — authored node (UI-gap #9, Workzilla-style horizontal banner).

  До: `slots.hero` инициализировался пустым массивом; только `heroCreate`-archetype intent'ы могли туда попасть. Авторский `projection.hero: {...}` полностью игнорировался.

  После: авторский hero-node (или array) кладётся в `slots.hero` **первым**. Если authored присутствует, `heroCreate` fallback'ит через стандартную логику (в toolbar как `intentButton`), потому что `slots.hero.length === 0` guard больше не срабатывает.

  ```js
  projection = {
    kind: "catalog",
    mainEntity: "Task",
    hero: {
      type: "carousel",
      slides: [
        {
          eyebrow: "Наши преимущества",
          title: "Новое задание каждые 28 секунд",
        },
        { eyebrow: "Безопасность", title: "Escrow на сумму сделки" },
      ],
    },
  };
  ```

  Принимает:

  - **Object** (single node) — обёртка в `[node]`.
  - **Array** — pass-through as-is.
  - **`null` / `undefined`** — legacy `hero:[]` initialized.

  ### Author-override precedence (catalog hero slot)

  `projection.hero` authored → всегда побеждает; `heroCreate` creator-intent fallback'ит в toolbar.

  ### Тесты

  +5 `assignToSlotsCatalog.hero.test.js` (1003 passing).

  ### Применение

  Freelance `task_catalog_public.hero: { type: "carousel", slides: [...] }` — horizontal rotating banner над списком задач (workzilla-скриншот 4 «Наши преимущества — Новое задание каждые 28 секунд»). До фикса carousel приходилось размещать в sidebar'е как обходной путь.

## 0.41.0

### Minor Changes

- 86ad499: Pattern Bank: curated-кандидаты — 8 researcher-паттернов из profi+avito field
  research (2026-04-17-18), прошедшие human review и строгий `validatePattern`
  (включая `falsification.shouldMatch`/`shouldNotMatch`). Matching-ready, без
  `structure.apply`.

  Новые файлы в `packages/core/src/patterns/candidate/{catalog,detail,feed}/`:
  category-tree-with-counter + paid-promotion-slot (merged profi+avito),
  map-filter-catalog, reputation-level-badge, rating-aggregate-hero,
  review-criterion-breakdown, direct-invite-sidebar, response-cost-before-action.

  Экспорт `CURATED_CANDIDATES` (отдельно от manifest-свалки 127+). Общий
  `CANDIDATE_PATTERNS` теперь union: сначала curated (строгая схема),
  потом manifest (schema-lax). `loadCandidatePatterns` регистрирует обоих,
  first-wins при коллизии id. Default registry по-прежнему stable-only —
  candidate остаются explicit opt-in.

  Promotion в stable + `structure.apply` — отдельный sub-project.

- 86ad499: Promote response-cost-before-action candidate → stable с полной реализацией.

  Cross-archetype (catalog/detail/feed — везде с toolbar). `apply` обогащает label
  toolbar-item'ов суффиксом ' · {cost} {currency}' для intent'ов с `costHint`
  (top-level, `meta`, или `particles`). Idempotent, детерминирован.

  Anti-footgun для monetized actions: 'Откликнуться · 80 ₽', 'Boost · 99 ₽'.
  Cost transparent до клика — закрывает profi/workzilla/youdo UX-gap.

  Modal-confirm force отложено (требует pipeline refactor).

## 0.40.0

### Minor Changes

- 59715cd: Pattern Bank: curated-кандидаты — 8 researcher-паттернов из profi+avito field
  research (2026-04-17-18), прошедшие human review и строгий `validatePattern`
  (включая `falsification.shouldMatch`/`shouldNotMatch`). Matching-ready, без
  `structure.apply`.

  Новые файлы в `packages/core/src/patterns/candidate/{catalog,detail,feed}/`:
  category-tree-with-counter + paid-promotion-slot (merged profi+avito),
  map-filter-catalog, reputation-level-badge, rating-aggregate-hero,
  review-criterion-breakdown, direct-invite-sidebar, response-cost-before-action.

  Экспорт `CURATED_CANDIDATES` (отдельно от manifest-свалки 127+). Общий
  `CANDIDATE_PATTERNS` теперь union: сначала curated (строгая схема),
  потом manifest (schema-lax). `loadCandidatePatterns` регистрирует обоих,
  first-wins при коллизии id. Default registry по-прежнему stable-only —
  candidate остаются explicit opt-in.

  Promotion в stable + `structure.apply` — отдельный sub-project.

- 59715cd: Promote review-criterion-breakdown candidate → stable с полной реализацией.

  **core:** новый stable pattern (detail archetype) с `structure.apply` — prepend'ит
  в `slots.sections` section `{type: "criterionSummary", subEntity, fkField, criteria,
title}`. Trigger: detail-проекция с sub-entity имеющим ≥3 criterion-полей
  (_\_rating / _\_score суффикс, whitelist quality/punctuality/..., или
  fieldRole:"rating"). Убран из curated candidate bank.

  **renderer:** новый primitive `CriterionSummary` — runtime compute avg по каждому
  criterion'у из `world[pluralized(subEntity)]`. Horizontal bar-chart с auto-scale
  (5 vs 10). Зарегистрирован в `PRIMITIVES.criterionSummary`.

## 0.39.0

### Minor Changes

- bb8f26f: feat(projection): `projection.gating` — onboarding prerequisites (UI-gap #6, Workzilla-style).

  Декларация шагов к разблокировке проекции — рендерятся как GatingPanel с step-cards и CTA-кнопками. Когда все steps done — panel скрывается автоматически.

  ```js
  projection = {
    kind: "catalog",
    mainEntity: "Task",
    gating: {
      title: "Необходимые шаги для доступа к заданиям",
      steps: [
        {
          id: "registration",
          label: "Регистрация",
          icon: "👤",
          done: "viewer.registered === true",
        },
        {
          id: "test",
          label: "Обязательное тестирование",
          icon: "📝",
          done: "viewer.testPassed === true",
          cta: { label: "Пройти", intentId: "start_test" },
        },
      ],
    },
  };
  ```

  ### Step lifecycle

  - `done` (string condition) — evaluated через `evalCondition({viewer, world})`.
    - `true` → зелёная плашка «✓ Пройдено».
    - `false` + `cta` → primary-button с `cta.label` → click = `ctx.exec(cta.intentId, cta.params)`.
    - `false` без cta → muted «Не выполнено».
  - Все steps done → panel **не рендерится** (return null).

  ### CTA handler

  - `cta.intentId` → `ctx.exec(intentId, cta.params || {})`.
  - `cta.onClick(ctx)` → custom handler (host-specific flows, вне Φ).

  ### Изменения

  **core (`assignToSlotsCatalog.js`)**: `projection.gating` → `slots.gating` как gatingPanel-node (или null).

  **renderer (`primitives/GatingPanel.jsx`)**: новый primitive в `PRIMITIVES.gatingPanel`. Adaptive grid `auto-fit, minmax(240px, 1fr)` для step-card'ов.

  **renderer (`ArchetypeCatalog.jsx`)**: рендерит `slots.gating` между hero и body (визуально — «шаги над списком задач», как в workzilla).

  ### Тесты

  - Core: +3 `assignToSlotsCatalog.gating.test.js` (971 passing).
  - Renderer: +9 `GatingPanel.test.jsx` (231 passing).

  ### Применение

  Workzilla-скриншот 4: «Сейчас размещено 1660 заданий» над списком, а выше — `Регистрация ✓ Пройдено / Обязательное тестирование [Пройти]` gating-panel.

## 0.38.0

### Minor Changes

- a7e6aef: feat(projection): `projection.sidebar` — static-content блоки слева от catalog (UI-gap #2, Workzilla-style).

  Авторы декларируют колонку static-content блоков (tutorial / promo / examples) рядом с catalog body.

  ```js
  projection = {
    kind: "catalog",
    mainEntity: "Task",
    sidebar: [
      {
        type: "card",
        children: [
          { type: "heading", content: "Как поручить задание?" },
          { type: "image", src: "/tutorial.svg" },
          { type: "text", content: "Посмотрите короткое видео." },
        ],
      },
      {
        type: "card",
        children: [
          { type: "text", content: "Подарите другу и себе по 100 ₽" },
          { type: "text", style: "muted", content: "Приведи друга..." },
        ],
      },
      {
        type: "column",
        children: [
          { type: "heading", content: "Примеры заданий", size: "sm" },
          { type: "text", content: "Расчистить балкон — 3500 ₽, Москва" },
          { type: "text", content: "Заехать в любой магазин..." },
        ],
      },
    ],
  };
  ```

  ### Изменения

  **core (`assignToSlotsCatalog.js`):** `projection.sidebar` → `slots.sidebar: []` pass-through. Non-array value graceful-падает в пустой массив.

  **renderer (`ArchetypeCatalog.jsx`):** рендерит `<aside>` колонку шириной 260px слева от content area (hero + body), когда `slots.sidebar` не пустой. `aria-label="Боковая панель"`. Background через `--idf-surface-soft` / `--idf-surface` fallback + borderRight `--idf-border`.

  ### Тесты

  - Core: +3 теста `assignToSlotsCatalog.sidebar.test.js` (971 passing).
  - Renderer: +3 теста `CatalogSidebar.test.jsx` (225 passing).

  ### Применение

  Workzilla-style (скриншот 1): слева "Как поручить задание?" (tutorial-card с play-button), "Подарите другу и себе по 100 рублей" (promo-card), "Примеры заданий" (list карточек задач). Все static-content, не intent-driven.

## 0.37.0

### Minor Changes

- 893d43f: feat(projection): `projection.tabs` — filter-views как табы над catalog (UI-gap #1, Workzilla-style).

  Автор декларирует несколько filter-вариантов на одной projection'е; renderer показывает tab-bar над списком, клик переключает активный фильтр.

  ```js
  projection = {
    kind: "catalog",
    mainEntity: "Task",
    filter: "item.customerId === viewer.id", // базовый фильтр (применяется первым)
    tabs: [
      { id: "new", label: "+ Новое", filter: "item.status === 'draft'" },
      { id: "open", label: "Открытые", filter: "item.status === 'published'" },
      {
        id: "history",
        label: "История",
        filter: { field: "status", op: "in", value: ["closed", "completed"] },
      },
    ],
    defaultTab: "open", // опц., иначе первый
  };
  ```

  ### Изменения

  **core (`assignToSlotsCatalog.js`):** `projection.tabs` → `body.tabs: [{id, label, filter}]` + `body.defaultTab`. Нормализация dropping entries без id, пустой массив даёт `tabs:undefined` (back-compat). Filter поддерживает и structured object (R7b/R10 формат), и legacy string-expression.

  **renderer (`primitives/containers.jsx` → `List`):**

  - Локальный `useState(activeTabId)` — per-List tab state (не глобальный).
  - Composition: `node.filter` (base) применяется первым, `activeTab.filter` — поверх (semantic AND).
  - Новый inline `TabBar` sub-component с `role="tablist"` / `aria-selected` для accessibility.

  ### Тесты

  - Core: +5 тестов `assignToSlotsCatalog.tabs.test.js` (927 passing).
  - Renderer: +6 тестов `listTabs.test.jsx` (191 passing).

  ### Использование в freelance

  ```js
  my_task_list: {
    witnesses: ["title", "status", "budget", "deadline"],
    tabs: [
      { id: "draft",     label: "+ Новое",  filter: "item.status === 'draft'" },
      { id: "open",      label: "Открытые", filter: "item.status === 'published'" },
      { id: "completed", label: "История",  filter: { field: "status", op: "in", value: ["closed", "completed"] } },
    ],
    defaultTab: "open",
  },
  ```

## 0.36.0

### Minor Changes

- 3101243: Pattern Bank: curated-кандидаты — 8 researcher-паттернов из profi+avito field
  research (2026-04-17-18), прошедшие human review и строгий `validatePattern`
  (включая `falsification.shouldMatch`/`shouldNotMatch`). Matching-ready, без
  `structure.apply`.

  Новые файлы в `packages/core/src/patterns/candidate/{catalog,detail,feed}/`:
  category-tree-with-counter + paid-promotion-slot (merged profi+avito),
  map-filter-catalog, reputation-level-badge, rating-aggregate-hero,
  review-criterion-breakdown, direct-invite-sidebar, response-cost-before-action.

  Экспорт `CURATED_CANDIDATES` (отдельно от manifest-свалки 127+). Общий
  `CANDIDATE_PATTERNS` теперь union: сначала curated (строгая схема),
  потом manifest (schema-lax). `loadCandidatePatterns` регистрирует обоих,
  first-wins при коллизии id. Default registry по-прежнему stable-only —
  candidate остаются explicit opt-in.

  Promotion в stable + `structure.apply` — отдельный sub-project.

## 0.35.0

### Minor Changes

- cfb2d64: feat(projection): `projection.emptyState` — richer empty-state для catalog (UI-gap #8, Workzilla-style).

  До: catalog рендерил дефолтный `"Пусто"` mute-текст при пустом результате.
  После: автор декларирует богатый empty-state:

  ```js
  projection = {
    kind: "catalog",
    mainEntity: "Task",
    emptyState: {
      illustration: "/empty-tasks.svg", // URL или React-нода
      title: "У вас пока нет заданий",
      hint: "Ваши открытые задания появятся здесь",
      cta: { label: "Дать задание", intentId: "create_task_draft" },
    },
  };
  ```

  ### Изменения

  **core (`assignToSlotsCatalog.js`):** если `projection.emptyState` объявлен, оборачивает его в `{ type: "emptyState", ...emptyState }` и кладёт в `slots.body.empty`. Без поля остаётся default text `"Пусто"`.

  **renderer (`primitives/EmptyState.jsx`):**

  - Зарегистрирован в `PRIMITIVES` dispatch table под ключом `emptyState` (SlotRenderer теперь распознаёт `{ type: "emptyState", ... }`).
  - Расширен полями `illustration` (URL или React-нода — крупная картинка над title) и `cta` (primary-кнопка: `{ label, intentId, onClick?, params? }`).
  - Dual-mode: primitive invocation (SlotRenderer передаёт `node={...}`) + legacy flat props (`<EmptyState title="..." />`) — back-compatible.
  - CTA click → `ctx.exec(intentId, params)` если intentId задан; `onClick(ctx)` для custom handler'ов.

  ### Тесты

  - Core: +3 теста `assignToSlotsCatalog.test.js` (925 passing).
  - Renderer: +6 тестов `EmptyState.test.jsx` (181 passing).

  ### Использование в доменах

  ```js
  // freelance/projections.js
  task_catalog_public: {
    // ...
    emptyState: {
      illustration: "/images/empty-market.svg",
      title: "Нет подходящих задач",
      hint: "Измените фильтр или вернитесь позже",
    },
  },

  // my_task_list (customer view на пустой state)
  my_task_list: {
    emptyState: {
      title: "У вас пока нет заданий",
      hint: "Ваши открытые задания появятся здесь",
      cta: { label: "Дать задание", intentId: "create_task_draft" },
    },
  },
  ```

## 0.34.0

### Minor Changes

- 2cabdb7: feat(assignToSlotsDetail): `projection.toolbar` whitelist honored в crystallize (author-override поверх pattern-bank routing).

  До: `projection.toolbar: [intentIds]` нигде не читался SDK'ом — поле игнорировалось. Intents auto-placement-ились SDK pattern-matching'ом:

  - phase-transition без params + `irreversibility !== "high"` → `primaryCTA`;
  - single-replace-on-main-field → `footer` (через `footer-inline-setter` pattern);
  - остальное — `toolbar` или `overflow`.

  После: если `projection.toolbar` включает `intentId`, intent **форсируется в toolbar**:

  - `assignToSlotsDetail` skip-ает `primaryCTA` routing для whitelisted intents (они идут через обычный `wrapByConfirmation` flow в toolbar);
  - `footer-inline-setter.structure.apply` skip-ает whitelisted intents (не переносит в footer, не strip-ит из toolbar).

  Author-override прецеденция (detail slot-routing): `footerIntents` → `toolbar` whitelist → автоматика.

  Обнаружено в freelance-домене (12-й полевой тест): `task_detail_customer` с `toolbar: [edit_task, publish_task, cancel_task_before_deal, select_executor]` показывал **пустой toolbar** в артефакте — phase-transition intents уходили в primaryCTA/footer, authored list игнорировался.

  Тесты: +5 (`assignToSlotsDetail.test.js` — 4 теста whitelist behavior; `footer-inline-setter.test.js` — 1 тест whitelist respect).

## 0.33.1

### Patch Changes

- fb47875: fix(deriveProjections): R7/R7b/R3b читает `entityDef.owners` с fallback к `ownerField`.

  `getOwnerFields` (в `ownershipConditionFor`) уже читал `owners` как новый API для multi-owner (backlog §3.2). Но `deriveProjections` (R7, R7b, R3b) читал только `ownerField`. Авторы онтологии, объявляющие `owners: ["customerId", "executorId"]` для `ownershipConditionFor` + `intent.permittedFor`, были вынуждены дублировать поле в `ownerField: [array]` чтобы R7b не отваливался.

  После фикса preference к `owners` (с fallback к `ownerField`) обеспечивает одну декларацию multi-owner на обе поверхности:

  ```js
  Deal: {
    owners: ["customerId", "executorId"],  // достаточно
    // ownerField больше не требуется
  }
  ```

  Обнаружено при работе с freelance-доменом (12-й полевой тест), multi-owner Deal + `intent.permittedFor` на phase-transitions.

## 0.33.0

### Minor Changes

- 4ebff4d: feat(materializers): `materializeAuditLog(phi, filter)` + `buildAuditContext(...)`.

  `materializeAuditLog` — чистая функция над `Φ = { effects }`, фильтрует confirmed effects по actor / timeRange / intentTypes / entityKind / entityId / ruleId и обогащает полями из `effect.context.__audit`. Основа audit-view для observer-role.

  `buildAuditContext({intent, actor, timestamp, ruleIds?, evidenceIds?, witnessChain?})` — helper для host-валидатора: строит канонический блок `__audit` с fnv1a-hash над canonical-json всего контента (стабильный cross-reference identifier, не криптоподпись).

  Use-case: 13-й полевой тест compliance-домен (SOX ICFR). Audit trail как derived view над Φ (не отдельная материализованная сущность), reader-equivalence с document/voice materializer'ами.

## 0.32.0

### Minor Changes

- d288926: feat(invariants): `expression`-kind передаёт predicate не только `row`, но и `world` / `viewer` / `context`.

  Backward-compat: существующие predicate-функции с single-arg `(row) => ...` продолжают работать (JS игнорирует лишние аргументы). Новые cross-entity сценарии — как `(row, world) => world.entities.find(...)` — теперь выражаются декларативно без выхода в domain-effects.

  Expression-строки также получают `world`, `viewer`, `context` как явные имена наряду с `with (row)` (поля row — bare identifiers, back-compat).

  Use-case: 13-й полевой тест compliance-домен (SOX ICFR) — invariants типа «CFO не подписывает cycle, содержащий собственный JE» и «threshold-approvals dynamic по amount» теперь выражаются одним expression-инвариантом вместо ручного enforce'а в buildEffects.

## 0.31.2

### Patch Changes

- 0fb39cb: fix(validateArtifact): composer не обязателен для feed

  `feed` архетип требовал `slots.composer` в `REQUIRED_SLOTS_BY_ARCHETYPE` в
  двух местах (core + renderer). Это наследство messenger chat-кейса: там
  composer всегда присутствует через `send_message` intent с
  `confirmation:"enter" + creates:"Message"`.

  Для любого другого feed (R11 temporal public, R11 v2 owner-scoped, любая
  read-only временная лента) intent'а с `confirmation:"enter"` нет,
  `assignToSlotsFeed` возвращает `slots.composer = null`, и validateArtifact
  блокирует рендер.

  Это ломало:

  - `reflect.insights_feed` (authored) — уже упало в main до этой правки,
    но было не замечено, т.к. reflect редко открывался в браузере.
  - `reflect.my_insight_feed` (R11 v2 derived, после активации в idf#70) —
    уже в artifacts, но не рендерился.

  Снято: `REQUIRED_SLOTS_BY_ARCHETYPE.feed = ["body"]`. Composer — особенность
  messenger chat, не инвариант feed-архетипа.

  Тесты: "требует composer для feed" заменён на "composer необязателен для feed".
  888/175 passed без регрессий.

## 0.31.1

### Patch Changes

- 9a5388c: Salience declaration-order tiebreak расширен на `assignToSlotsCatalog` (catalog/feed projections). Ранее был только в `assignToSlotsDetail` — catalog-toolbar'ы продолжали falling back to alphabetical.

  Теперь declarationOrder пробрасывается из `Object.entries(INTENTS)` index во все toolbar-push'ы catalog'а (creator, projection-level overlay, projection-level click, inlineSearch).

  Zero-breaking: backward-compat через Infinity fallback при missing declarationOrder. Existing 895 тестов passing без regression.

  Host impact: после bump → `sales/listing_feed` alphabetical-fallback witnesses (4 остаточных после host #70) должны упасть до 0.

## 0.31.0

### Minor Changes

- 4a2ef3e: Salience tie-break ladder: `declarationOrder` (authorial signal из порядка intents в `INTENTS`-object) как tier 1 tiebreaker между equal salience. Alphabetical остаётся tier 2 (last resort).

  Witness `basis: "declaration-order"` маркирует резолюцию tier 1 — less noisy чем alphabetical-fallback, не требует массовых intent.salience аннотаций. Author сразу закладывает приоритет порядком declarations: «ставлю важнее первым».

  API:

  - `bySalienceDesc(a, b)` — ladder: `salience desc → declarationOrder asc → alphabetical asc`
  - `classifyTieResolution(a, b)` — новый util, возвращает `"salience" | "declaration-order" | "alphabetical-fallback"`
  - `detectTiedGroups(sortedItems, ctx)` — различает basis исходя из declarationOrder uniqueness внутри tied-группы

  Breaking: нет. Все existing tests pass (895 core). Авторы без declaration-order получают alphabetical как раньше.

  `assignToSlotsDetail` пробрасывает `declarationOrder` в toolbar button specs.

## 0.30.0

### Minor Changes

- 0d9883e: Structured-filter: рендерер понимает формы из R3b / R7b / R10 / R11 v2

  Закрывает backlog 1.X / 1.Y: `projection.filter` от новых R-правил теперь
  интерпретируется в UI, а не игнорируется.

  **core**

  - Новый shared helper `evalFilter(filter, row, { viewer, world })` —
    единая surface для четырёх форматов, которые эмитят R-правила: - `string` — legacy JS-выражение (back-compat для messenger buildBody и
    authored viewState-фильтров); - `{ field, op, value }` — простой predicate (R3b singleton, R11 v2 feed),
    `value: "me.id"` резолвится через `viewer.id`; - `{ kind: "disjunction", fields, op, value }` — OR across полей
    (R7b multi-ownerField); - `{ kind: "m2m-via", via, viewerField, joinField, localField,
statusField?, statusAllowed? }` — bridge-lookup (R10 role.scope).
  - `documentMaterializer` и `voiceMaterializer` мигрированы на этот helper —
    теперь тоже корректно фильтруют structured-filter'ы (до этого упали бы
    в permissive fallback).
  - `assignToSlotsFeed::buildBody` обобщён: `mainEntity === "Message"` →
    прежний messenger chat template; любой другой `mainEntity` → generic
    `buildCatalogBody`, который прокидывает `projection.filter`/`sort`
    декларативно. Закрывает path для R11 v2 `my_*_feed`.

  **renderer**

  - `List` primitive (`primitives/containers.jsx`) различает object-filter
    и string-filter. Object → `evalFilter` (structured), string →
    `evalCondition` (legacy с viewState/query). R9 compositions применяются
    как раньше, до фильтра.
  - `ArchetypeDetail` поддерживает `projection.singleton: true` — target
    резолвится через `projection.filter` (без `idParam`), EmptyState адаптирован
    под «запись ещё не создана». Резолвер вынесен в `resolveDetailTarget`
    для unit-тестов.

  Новые тесты: `filterExpr.test.js` (19), `buildGenericFeed.test.js` (6),
  `listFilter.test.jsx` (6), `resolveDetailTarget.test.js` (8).

## 0.29.0

### Minor Changes

- ac0881a: feat(core): R11 v2 — owner-scoped temporal feed (my\_<entity>\_feed)

  Расширение R11: если entity имеет `temporal: true` **И** `ownerField` (string) —
  генерируется **дополнительно** `my_<entity>_feed` с owner-фильтром + temporal sort.

  Аналог отношения R1 → R7 для временных лент.

  ```js
  ontology.entities.Insight = {
    temporal: true,
    ownerField: "userId",     // R11 v2 trigger (в дополнение к temporal)
    fields: { userId: {...}, createdAt: {...} },
  };
  ```

  → derived (в дополнение к R1 catalog и public `insight_feed`):

  - **`my_insight_feed`** — kind:"feed", filter:{field:"userId", ...}, sort:"-createdAt"

  Witness `ruleId:"R11"` получает `input.ownerScoped: true` и `input.ownerField`.

  Constraints:

  - `entity.temporal === true` + `ownerField` (string) — оба нужны
  - Array ownerField (multi-owner) не триггерит — future R11b candidate (disjunction feed)
  - Fallback-friendly: base может быть R1 catalog ИЛИ R3 detail

  **Motivation**: reflect.insights_feed uncovered в baseline — authored feed с
  owner-filter. Public R11 не matched из-за filter-presence mismatch. Owner-scoped
  variant закрывает кейс.

  **Empirical trigger**: [DubovskiyIM/idf#64](https://github.com/DubovskiyIM/idf/pull/64) surfaced.

  Spec: `idf-manifest-v2.1/docs/design/rule-R11-temporal-feed-spec.md` (updated).

  **Backward compat**: zero breaking.

  - Entities с `temporal:true` без `ownerField` → поведение unchanged (только public feed).
  - Entities с `temporal:true` + string `ownerField` → **новая** capability.
  - Entities без `temporal` → не затронуты.

  Тесты: +2 в witnesses.test.js (positive owner-scoped, array ownerField
  не-триггер). **863/863 зелёные**, functoriality probe без регрессий.

## 0.28.0

### Minor Changes

- 75b96ae: feat(core): R11 — temporal feed rule

  Новое правило деривации. Entity с opt-in флагом `temporal: true` получает
  **дополнительную** проекцию `<entity>_feed` с `kind:"feed"` + `sort:"-<timestampField>"`.
  Применяется к event-like сущностям (Insight, Notification, Activity) —
  монотонно растущие append-only потоки.

  ```js
  ontology.entities.Insight = {
    temporal: true,                  // R11 trigger
    timestampField: "createdAt",     // опционально, default "createdAt"
    fields: { createdAt: {...}, ...},
  };
  ```

  → derived (дополнительно к R1 catalog):

  - `insight_feed` — kind:"feed", sort:"-createdAt"

  Witness `basis:"crystallize-rule"`, `ruleId:"R11"`.

  **Fallback-friendly**: при отсутствии R1 catalog, R11 использует R3 detail
  как base (тот же паттерн, что R7 v2). `sourceBase` записывается в witness
  input для trail-видимости.

  Constraints:

  - Требует `entity.temporal === true` — explicit opt-in
  - Нужен R1 catalog ИЛИ R3 detail как base
  - Generates `<entity>_feed` **в дополнение** к catalog, не заменяет

  **Mutual exclusion** с R2 (confirmation:"enter" + FK override): R2 и R11
  могут сосуществовать. R2 создаёт `<entity>_list` с kind:"feed" (замена
  catalog). R11 создаёт отдельный `<entity>_feed` key. Semantically R2 —
  messaging (scoped by parent conversation), R11 — event streams (глобально).

  **Motivation**: reflect.insights_feed uncovered в baseline — временная
  лента aналитических insights. Без R11 authored feed с sort:"-createdAt"
  писался вручную. После: `Insight.temporal = true` → автоматически.

  Spec: `idf-manifest-v2.1/docs/design/rule-R11-temporal-feed-spec.md` (draft).

  **Backward compat**: zero breaking. `entity.temporal` — новый opt-in флаг.
  Entities без этого флага — поведение unchanged.

  Тесты: +4 в witnesses.test.js (basic temporal feed, explicit
  timestampField override, no-flag negative, R3 detail fallback).
  **845/845 зелёные**, functoriality probe без регрессий.

  **Completes R-rule roadmap to 13 правил**:
  R1, R1b, R2, R3, R3b, R4, R6, R7 v2, R7b, R8, R9, R10, **R11**.

## 0.27.0

### Minor Changes

- 0c866a7: `filterWorldForRole` поддерживает `entity.owners[]` multi-owner — row visible когда совпадает любое из owner-полей с `viewer.id`. Новый export `getOwnerFields(entity, intent?)` в `crystallize_v2/ontologyHelpers.js` унифицирует resolve: `entity.owners[]` > `entity.ownerField` (legacy) > `[]`; с `intent.permittedFor` — subset фильтр.

  Backward compat: legacy single `ownerField` работает через тот же util (возвращает массив из одного). Существующие 10 доменов не требуют миграции.

  `assignToSlotsDetail.js` переиспользует новый util (удалена дубликатная inline `resolveOwnerFields`).

  Закрывает `docs/sdk-improvements-backlog.md` §3.2 полностью (ранее было реализовано только в `ownershipConditionFor` для detail toolbar, но не в viewer-scoping).

## 0.26.0

### Minor Changes

- c8b40cf: feat(core): R7/R7b independence from R1 — fallback на R3 detail

  Ослаблен precondition для R7 (owner-filtered catalog) и R7b (multi-owner
  disjunction): `my_<entity>_list` теперь генерируется когда существует
  **любой** base — R1 catalog **или** R3 detail (раньше требовался catalog).

  **Мотивация**: side-effect-created entities (Deal через accept*response,
  Assignment через invite_accepted, Order через checkout и т.д.) имеют
  mutators (edit/close/cancel) но не имеют `creates:E` intent'а. R3 detail
  выводится, R1 catalog — нет. До этого фикса R7 precondition проваливался,
  my*_*list не создавался, authored `my*_` projections оставались uncovered.

  **Priority**: если оба (catalog + detail) существуют — приоритет catalog
  для witnesses inheritance (стабильность). Только detail — R3 становится
  sole base.

  **Witnesses**: наследуются от того base, который доступен. Новое поле в
  input — `sourceBase`. `sourceCatalog` сохранён для backward compat.

  ```js
  ontology.entities.Deal = {
    ownerField: ["customerId", "executorId"],
    fields: {...},
  };

  intents = {
    accept_response: { particles: { effects: [
      { α: "replace", target: "response.status" },
      { α: "create",  target: "deal" },  // side-effect creation
    ]}},
    edit_deal:  {...},
    close_deal: {...},
  };

  // Было: deal_list undefined → my_deal_list undefined (R7b не срабатывал)
  // Стало: deal_detail derived (R3) → my_deal_list derived (R7b через fallback)
  //        filter: { kind: "disjunction", fields: [...], op: "=", value: "me.id" }
  ```

  Emprical motivation: [DubovskiyIM/idf#60](https://github.com/DubovskiyIM/idf/pull/60) surfaced этот blocker
  на freelance.Deal (ownerField uniquely array, но R1 не выведен).

  **Backward compat**: zero breaking.

  - Entities с R1 catalog + ownerField → unchanged (catalog остаётся
    primary base).
  - Entities без catalog но с detail + ownerField → **теперь** получают
    my\_\*\_list (новая capability).
  - Entities без base вовсе → не затронуты (nothing to filter).

  Тесты: +4 в `witnesses.test.js` (side-effect entity R7, side-effect R7b,
  catalog priority over detail, no-base negative). **841/841 зелёные**,
  functoriality probe без регрессий.

  Spec: `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`
  (R-rule evolution map).

## 0.25.0

### Minor Changes

- ddc222c: feat(core): R3b — singleton owner-scoped detail rule

  Расширение R3: когда entity объявлен `singleton: true` + `ownerField` (string,
  single-owner) — deriveProjections выводит **дополнительную** проекцию
  `my_<entity>_detail` без idParam, с owner-фильтром. Применяется к сущностям
  по одной записи на пользователя (Wallet, RiskProfile, UserSettings).

  ```js
  ontology.entities.Wallet = {
    ownerField: "userId",
    singleton: true,       // новый флаг
    fields: { userId: {...}, balance: {...} },
  };
  ```

  → derived:

  - `wallet_detail` — обычный R3 detail (base detail, требует idParam для admin)
  - `my_wallet_detail` — **новое**, R3b singleton: без idParam, filter
    `{field: "userId", op: "=", value: "me.id"}`, пометка `singleton: true`

  Witness basis:"crystallize-rule", ruleId:"R3b".

  **Constraints**:

  - R3b требует `entity.singleton === true` (явный opt-in)
  - `ownerField` должен быть string (не array — R3b не совместим с R7b multi-owner)
  - Base detail (R3) должен быть выведен — R3b зависит от R3

  **Motivation**: freelance.wallet uncovered в idf#58 baseline — detail с
  owner-filter как паттерн. Без R3b авторы пишут такие проекции вручную.

  Mutual exclusion с R7b: R3b требует single ownerField, R7b требует array
  ≥2. Общая логика: author выбирает single (R7+R3b) vs multi (R7b).

  Spec: `idf-manifest-v2.1/docs/design/rule-R3b-singleton-detail-spec.md`
  (draft).

  **Backward compat**: zero breaking. `entity.singleton` — новый opt-in флаг.
  Entities без этого флага ведут себя как раньше.

  Тесты: +4 в witnesses.test.js (positive singleton, negative без флага,
  negative с array ownerField, negative без base R3 detail).
  **837/837 зелёные**, functoriality probe без регрессий.

  Renderer: primitive для singleton-detail (без route-params) — отдельный
  follow-up в @intent-driven/renderer.

  Stacked on [#73](https://github.com/DubovskiyIM/idf-sdk/pull/73) (R7b).

## 0.24.0

### Minor Changes

- 8f6165b: feat(core): R7b — multi-ownerField disjunction catalog rule

  Расширение R7: `entity.ownerField` может быть **массивом** (2+ элементов) →
  генерируется `my_<entity>_list` с disjunction-фильтром (OR).

  ```js
  ontology.entities.Deal = {
    ownerField: ["customerId", "executorId"],  // multi-owner
    fields: { customerId: {...}, executorId: {...} },
  };
  ```

  → derived `my_deal_list` с:

  ```js
  {
    kind: "catalog",
    mainEntity: "Deal",
    filter: {
      kind: "disjunction",
      fields: ["customerId", "executorId"],
      op: "=",
      value: "me.id",
    },
    derivedBy: [witnessR7bMultiOwnerFilter(...)],
  }
  ```

  **Mutual exclusion**: R7 (single owner) и R7b (multi-owner) взаимоисключающи
  на одной entity. Array с `length === 1` **не** триггерит R7b (требование ≥2);
  такая проекция вообще не генерируется — автор должен либо указать string
  (R7), либо добавить второй owner (R7b).

  Motivation: backlog 3.2 в freelance (Deal имеет customerId + executorId —
  обе — legitimate ownership relations). Authored `my_deals` с filter
  `"customerId === me.id OR executorId === me.id"` можно теперь вывести
  через R7b.

  Спецификация: `idf-manifest-v2.1/docs/design/rule-R7b-multi-owner-spec.md`
  (draft); основная мотивация — `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`
  (Baseline 2026-04-20, R-rule candidates).

  **Backward compat**: `ownerField: "x"` (string) продолжает работать через
  R7 без изменений. Array-form — opt-in новая capability.

  Тесты: +3 в witnesses.test.js (R7b multi-owner, array-length-1 не-триггер,
  3+ ownerFields). 833/833 зелёные.

  Renderer-стороны: `filter.kind === "disjunction"` — новый формат для
  catalog'а, который `List` primitive должен уметь фильтровать. В этом PR
  не затронут; separate follow-up на renderer-пакет.

## 0.23.0

### Minor Changes

- 2e02b73: Добавлен `computeSlotAttribution(intents, ontology, projection)` — карта `{ slotPath → { patternId, action } }` для X-ray режима PatternInspector и derivation-diff CLI. Прокатывает `applyStructuralPatterns` пошагово (с deep-clone snapshot между шагами, чтобы in-place мутации в apply-функциях не повреждали diff), фиксирует added/modified пути.

## 0.22.0

### Minor Changes

- eb2954d: feat(core): witness-of-crystallization для R1–R8 в artifact.witnesses

  Каждое срабатывание правил деривации (R1 catalog, R2 feed override, R3 detail, R4 subCollection, R6 field-union, R7 ownerField, R8 hub absorption — parent и child side) оставляет запись в `artifact.witnesses[]` с `basis: "crystallize-rule"`, полями `ruleId`, `input`, `output`, `rationale`.

  Назначение: debugging derived UI — второй автор видит observable trail того, какое правило и на каком входе породило проекцию/обогащение. Вместе с существующими `pattern-bank` и `alphabetical-fallback` witnesses даёт полный derivation-граф для Studio Inspector и spec-debt метрик.

  Спецификация: `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`.

  **API additions** (аддитивно, zero-breaking):

  - `proj.derivedBy: CrystallizeWitness[]` — внутренний канал между `deriveProjections` и `crystallizeV2`; пробрасывается в `artifact.witnesses` первыми (origin-witnesses идут до pattern-bank).
  - Новый модуль `crystallize_v2/derivationWitnesses.js` — чистые builder-функции per правило.

  **Тесты**: +13 в `witnesses.test.js` (формат каждого witness'а + negative cases + integration через crystallizeV2 + hub через absorbHubChildren). 630/630 зелёные, functoriality probe без регрессий.

- eb2954d: feat(core): explainCrystallize — unified witness query surface

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

- eb2954d: feat(core): near-miss witnesses — актionable rationale для не-сработавших правил

  Новая функция `collectNearMissWitnesses(intents, ontology)` возвращает массив
  «отрицательных» witness'ов: где R-правило могло бы сработать, но не сработало,
  и что автор может сделать чтобы запустить.

  Basis: `"crystallize-rule-near-miss"` (новый, отличается от positive
  `"crystallize-rule"`).

  **Покрываемые правила**:

  - **R3**: entity с ровно 1 mutator (threshold = >1 для detail). Rationale:
    «|mutators(Category)| = 1; R3 требует >1». Suggestion: «Добавьте второй
    mutator или объявите category_detail явно».
  - **R1b**: изолированная entity (creators=0, не kind:reference, не referenced
    по FK). Suggestion: пометить `kind:"reference"` или удалить из ontology.
  - **R7**: entity с creators и owner-candidate полем (userId/ownerId/authorId/
    creatorId), но без `ownerField` declaration. Suggestion: объявить
    `ontology.entities.E.ownerField = "userId"`.
  - **R10**: agent/observer роль без scope declaration. Suggestion: добавить
    `role.scope = { Entity: { via, viewerField, joinField, localField } }`.

  **Исключения**: `entity.kind: "assignment"` не триггерит R1b/R3/R7;
  owner/viewer base-роли без scope — не триггерят R10.

  Также экспортируется `groupNearMissByRule(nms)` — группировка по ruleId для
  render'а.

  **Consumer**: CrystallizeInspector (§27 Studio), uncovered-classification.mjs,
  explainCrystallize extensions.

  Спецификация: `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`
  (секция «Witness'ы для не-сработавших правил»).

  Тесты: +16 в nearMissWitnesses.test.js (R3/R1b/R7/R10 positive + negatives,
  assignment-exclusion, group, edge cases). 689/689 зелёные.

- eb2954d: feat(core): resolveCompositions — runtime helper для R9 aliased-fields

  Завершает R9 end-to-end: crystallize добавляет `proj.compositions`,
  runtime раскрывает alias'ы при чтении из `world`.

  API:

  ```js
  resolveItemCompositions(item, compositions, world) → enrichedItem
  resolveCompositions(items, compositions, world)    → enrichedItems[]
  getAliasedField(item, "task.title")                → value | undefined
  ```

  Режимы:

  - `mode: "one"` (default) — `item[as] = world[entity].find(x => x.id === item[via])`
  - `mode: "many"` — `item[as] = world[entity].filter(x => x[via] === item.id)`

  Обработка edge-cases:

  - Missing FK value → `null` (one), `[]` (many).
  - Missing entity в world → `null` (one), `[]` (many).
  - Items не мутируется (чистая функция).

  `getAliasedField(item, path)` — null-safe lookup для multi-level path'ов
  (`"customer.address.city"`). Consumer — primitive atoms в
  @intent-driven/renderer, которые должны уметь рендерить `witnesses`
  вида `"task.title"` без падения на undefined.

  Спецификация: `idf-manifest-v2.1/docs/design/rule-R9-cross-entity-spec.md`.

  Тесты: +16 в resolveCompositions.test.js (one/many mode, missing refs,
  batch, null-safety, multi-level paths). 673/673 зелёные.

  Следующий шаг для end-to-end R9: обновить primitive atoms в
  @intent-driven/renderer чтобы использовать `getAliasedField` при чтении
  alias-полей из `proj.witnesses`. Отдельный PR в renderer-пакете.

- eb2954d: feat(core): R10 — role-scope filtered catalog rule

  Новое правило деривации: для каждой роли с `role.scope[entityName]` в онтологии,
  генерируется scoped read-only catalog с structured m2m-via filter.

  Поддерживает формат `role.scope` v1.6 (реальный в invest):

  ```js
  ontology.roles.advisor = {
    scope: {
      User: {
        via: "assignments",
        viewerField: "advisorId",
        joinField: "clientId",
        localField: "id",
        statusField: "status", // опционально
        statusAllowed: ["active"], // опционально
      },
    },
  };
  ```

  Output: `advisor_user_list` с `kind:"catalog"`, `readonly:true`, `filter:{ kind:"m2m-via", via, viewerField, joinField, localField, statusField, statusAllowed }`.

  Witness `basis:"crystallize-rule"`, `ruleId:"R10"` несёт role, entity и full scope spec для audit trail.

  Incomplete scope-spec'и (отсутствие via/viewerField/joinField/localField) игнорируются. Роли без scope — не триггерят.

  Спецификация: `idf-manifest-v2.1/docs/design/rule-R10-role-scope-spec.md`.

  **Baseline impact** (stacked on R1b):

  - До R10: U = 23 (20%)
  - После R10: U = 22 (19%)
  - **Δ = -1** (invest.advisor_clients ← advisor_user_list)

  Spec предсказывал -6–7. Расхождение — domain authoring gap: messenger/delivery/sales не объявляют `role.scope`, пишут filter-строки вручную в PROJECTIONS. Ontology authoring workstream — отдельно.

  Тесты: +4 (m2m-via positive, multi-entity scope, incomplete-spec negative, no-scope negative). 645/645 зелёные.

- eb2954d: feat(core): R1b — read-only entity catalog rule

  Новое правило деривации: если `entity E` не имеет creator-intent'ов
  (`creators(E) = ∅`), но либо объявлена `kind: "reference"` (v1.6 онтология),
  либо на неё ссылаются foreignKey-поля (`type: "entityRef"`) из других
  сущностей — `deriveProjections` выводит `<entity>_list` с
  `readonly: true`.

  Исключение: `entity.kind === "assignment"` (m2m-связки) не триггерят R1b.

  Приоритет: R1 (обычный catalog при `creators ≠ ∅`) имеет приоритет над R1b.

  Witness `basis:"crystallize-rule"` с `ruleId:"R1b"`:

  ```js
  {
    input: { entity, creators: [], source: "kind:reference" | "referenced-by", referencedBy },
    output: { kind: "catalog", mainEntity: entity, readonly: true },
    rationale: "Entity.kind === 'reference' + creators = ∅ → read-only catalog"
  }
  ```

  Тесты: 5 новых в `witnesses.test.js` (source:kind:reference,
  source:referenced-by, assignment-exclusion, isolated-entity-negative,
  R1-priority). 641/641 зелёные.

  Спецификация: `idf-manifest-v2.1/docs/design/rule-R1b-read-only-catalog-spec.md`.

  **Baseline impact** (по measurement через `idf/scripts/uncovered-classification.mjs`
  на 10 доменах):

  - До R1b: U = 24 (21%)
  - После R1b: U = 23 (20%)
  - **Δ = -1 (вместо ожидаемых -7)**.

  Причина расхождения: большая часть uncovered candidates
  (`delivery.zones_catalog`, `delivery.couriers_list`, `booking.service_catalog`,
  `lifequest.badge_list`) имеют FK-поля с `type: "text"` вместо `"entityRef"`.
  R1b по спеке требует корректной типизации через `entityRef` — это ontology
  audit gap, не bug SDK. Фикс ontologies — отдельный workstream.

- eb2954d: feat(core): R9 — cross-entity composite projection (MVP)

  Новое правило деривации: `ontology.compositions[mainEntity]: CompositionDef[]`
  обогащает все проекции с этим mainEntity полями `compositions` (список
  join-aliases) и расширяет `entities[]` целевыми сущностями.

  Формат композиции:

  ```js
  ontology.compositions = {
    Deal: [
      { entity: "Task", as: "task", via: "taskId", mode: "one" },
      { entity: "User", as: "customer", via: "customerId", mode: "one" },
    ],
  };
  ```

  Обогащение catalog/detail/feed с `mainEntity === "Deal"`:

  - `proj.entities = ["Deal", "Task", "User"]`
  - `proj.compositions = [...]`
  - `proj.derivedBy += witnessR9Composite(...)`

  Incomplete entries (без `entity`/`as`/`via`) игнорируются.

  MVP scope: только обогащение проекций. **Не входит в PR:** renderer-поддержка
  aliased path lookup (`task.title`), runtime `resolveCompositions(world, ...)`
  helper, cascade multi-hop composition. Эти — последующие PR'ы в том же
  workstream.

  Спецификация: `idf-manifest-v2.1/docs/design/rule-R9-cross-entity-spec.md`.

  **Baseline impact** (stacked on R1b + R10):

  - До R9: U = 22 (19%)
  - После R9: U = 22 (19%)
  - **Δ = 0**

  Ни один из 10 доменов не объявляет `ontology.compositions` — это новое
  поле, предложенное спецификацией. R9 работает корректно (проверено тестами),
  но реальное закрытие U требует domain authoring workstream — объявить
  compositions в ontologies freelance (Deal, Wallet), delivery (Order, Cart),
  sales (Watchlist).

  **Совокупный результат SDK workstream**:

  - baseline: U = 24 (21%)
  - после R1b+R10+R9: U = 22 (19%), Δ = -2 из возможных -13 (15% от spec prediction)

  **Главная эмпирическая находка**: SDK-правила корректны, но **impact заблокирован
  ontology authoring gap**. Форматная capability появляется инкрементально, но её
  полная реализация — параллельный workstream правильной типизации и декларации
  в existing ontologies, не SDK change.

  Тесты: +4 в witnesses.test.js (basic composition, no-compositions, incomplete
  entries filtered, compositions on both catalog+detail). 649/649 зелёные.

## 0.21.0

### Minor Changes

- 265af59: feat(core): witness-of-crystallization для R1–R8 в artifact.witnesses

  Каждое срабатывание правил деривации (R1 catalog, R2 feed override, R3 detail, R4 subCollection, R6 field-union, R7 ownerField, R8 hub absorption — parent и child side) оставляет запись в `artifact.witnesses[]` с `basis: "crystallize-rule"`, полями `ruleId`, `input`, `output`, `rationale`.

  Назначение: debugging derived UI — второй автор видит observable trail того, какое правило и на каком входе породило проекцию/обогащение. Вместе с существующими `pattern-bank` и `alphabetical-fallback` witnesses даёт полный derivation-граф для Studio Inspector и spec-debt метрик.

  Спецификация: `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`.

  **API additions** (аддитивно, zero-breaking):

  - `proj.derivedBy: CrystallizeWitness[]` — внутренний канал между `deriveProjections` и `crystallizeV2`; пробрасывается в `artifact.witnesses` первыми (origin-witnesses идут до pattern-bank).
  - Новый модуль `crystallize_v2/derivationWitnesses.js` — чистые builder-функции per правило.

  **Тесты**: +13 в `witnesses.test.js` (формат каждого witness'а + negative cases + integration через crystallizeV2 + hub через absorbHubChildren). 630/630 зелёные, functoriality probe без регрессий.

## 0.20.0

### Minor Changes

- db67207: SDK improvements backlog (PRs #50–#57): invariants schema-drift, multi-owner
  ownership, parameter affinity matching, 8 новых stable паттернов, candidate
  bank со 127 JSON-кандидатами, AdapterProvider / AuthForm / Countdown /
  UndoToast primitives.

  ## @intent-driven/core

  **Invariants (PR #50 + #52):**

  - schema-drift graceful fallback: unknown_kind / handler_threw /
    unsupported_shape → severity:"warning" (раньше ронили effect)
  - `invariants/normalize.js` — поддержка альтернативных форм referential /
    aggregate / transition
  - `invariant.where` расширен на transition / referential / aggregate
  - Новый kind `"expression"` — row-level predicate / JS-выражение
  - `cardinality.groupBy` может быть массивом (composite key)

  **Crystallizer (PR #50 + #51 + #52 + #53):**

  - `inferParameters` читает `intent.particles.parameters` как fallback
  - `selectArchetype` нормализует `intent.confirmation ?? particles.confirmation`
  - `footer-inline-setter.apply` отсекает textarea/file/multiImage
  - `assignToSlotsDetail`: phase-transition с parameters пропускается через
    `wrapByConfirmation` в toolbar (не primaryCTA)
  - multi-owner ownership: `entity.owners: [a,b]` + `intent.permittedFor`
  - `collapseToolbar` dedup только при salience < 70
  - `buildDetailBody` инжектит irreversibleBadge при irreversibility:"high"
  - subCollection FK-implicit addControl + authored `itemView`/`sort`/
    `where`/`terminalStatus`/`hideTerminal`/`toggleTerminalLabel`

  **Pattern Bank: 8 новых stable + 127 candidate (PRs #52–#57):**

  - §6.1 `catalog-creator-toolbar` (multi-param → toolbar, не hero)
  - §6.5 `timer-countdown-visible` (scheduled_timer → countdown node)
  - §6.6 `catalog-exclude-self-owned` (filter item.ownerField !== viewer.id)
  - Merge-промоции:
    - `faceted-filter-panel` (3 → 1): typed controls по field-role
    - `reputation-tier-badge` (4 → 1): boolean/enum tier-detect
    - `paid-visibility-elevation` (4 → 1): elevation markers
    - `computed-cta-label` (3 → 1): live total в CTA для _Extra_/
      _Modifier_/_AddOn_ child-entities
    - `undo-toast-window` (2 → 1): soft-cancel для repeatable destructive
  - Candidate bank (`patterns/candidate/`): 127 JSON из Claude Researcher
    Pipeline, `getCandidate`, `getCandidatesByArchetype`,
    `groupCandidatesByTheme`, `loadCandidatePatterns`
  - Registry: 20 → 28 stable patterns

  ## @intent-driven/renderer

  - `pickAdaptedComponent(spec)` — matching-score резолвер, учитывает
    `spec.fieldRole / name / features` через adapter.affinity
  - `ParameterControl` использует `pickAdaptedComponent` как primary
    (fallback: legacy `getAdaptedComponent(spec.control)` → built-in)
  - `<AdapterProvider>` + хуки `useAdapter / useAdapterComponent /
useAdapterPick / resolveAdapterComponent` (React Context вместо
    global mutable registry)
  - Primitives: `<AuthForm>` (login/register/both), `<Countdown>`
    (read scheduledTimers), `<UndoToast>` (soft-cancel window)
  - ArchetypeDetail `AntdOverflowMenu` респектит `spec.condition`

  ## adapter-antd / mantine / shadcn / apple

  - Buttons (primary/secondary/danger) принимают `label` И `children`
    (приоритет label) — antd
  - `AntdDateTime` с `withTime / precision / control:"datetime-local"`
  - `AntdNumber` с `fieldRole ∈ {money, price}`
  - `AntdTextInput` пробрасывает `maxLength/minLength/pattern`
  - Affinity декларации на Number/DateTime/Tel/Email для всех четырёх
    адаптеров (matching-score integration)

## 0.19.0

### Minor Changes

- e736b61: `checkComposition` dominance rule: `remove` на базовой коллекции конфликтует с field-level effect на той же сущности.

  ## Проблема

  До фикса `checkComposition({alpha:"replace", target:"items.status"}, {alpha:"remove", target:"items"})` возвращал `{compatible: true, resolution: "different_target"}` — потому что строки target отличаются.

  Но семантически они конфликтуют: нельзя `replace` поле сущности, которую одновременно `remove`. Это нарушает intent-композицию: если выполнить обе `replace` и `remove` на одну сущность, результат определён только их причинным порядком, что не derivable из спеки без дополнительных предположений.

  ## Фикс

  Dominance rule в `checkComposition`:

  - Если один эффект — `remove` на **базовой коллекции** (target не содержит `.`)
  - Второй — effect на **field-path** той же коллекции (target содержит `.`)
  - Результат: **conflict** (⊥)

  Раньше такие пары трактовались как `different_target`. Это расхождение с spec §6 и причина провала conformance-test `level-3/composition-001`.

  ## Эффект на conformance

  С этим fix'ом + host-side runner changes (idf#39) → **55/55 conformance тестов проходят**.

  ## Совместимость

  - **Forward**: добавляется дополнительный conflict-случай, который ранее был false-compatible. Domains, которые этот случай использовали (один intent removing entity, другой editing его field), теперь получат algebra excluding-edge между ними — что корректно. Эти пары обычно не should-co-execute.
  - **Существующие тесты**: 619/619 passing (нет регрессии — тесты не полагались на false-compatible случай).

  ## Связанное

  - idf#38 — conformance фикстуры в canonical format + runner (merged)
  - idf#39 — level-3 findings alignment + level-1/2 runner fixes (merged)

  После слияния этого PR + release: все conformance-testы проходят end-to-end на @intent-driven/core.

## 0.18.0

### Minor Changes

- d01d8de: feat(core): irreversible-confirm pattern — structure.apply

  Добавлена `structure.apply(slots, context)` функция к stable-паттерну
  `irreversible-confirm`. Обогащает существующий confirmDialog overlay
  полем `warning` из декларативного `intent.__irr.reason`.

  **Семантика:** apply не создаёт overlay — он уже строится `controlArchetypes.confirmDialog`
  по intent.irreversibility. Apply _обогащает_ overlay семантическим warning-текстом
  из intent declaration (`__irr: { point, reason }`), чтобы рендерер показал его
  над дефолтным typeText-диалогом.

  **Pure function.** Не мутирует slots; idempotent.

  **Closes:** один из 10 open items v1.12 «pattern-bank: structure.apply для оставшихся stable паттернов».

## 0.17.0

### Minor Changes

- 5a6429d: Witness `alphabetical-fallback` — видимость spec-debt в артефакте.

  Когда `crystallizeV2` разрешает slot-contention через `intent.salience` (§3.5 спеки v1.1) и две или более intent'ов имеют равный salience, финальный выбор делается лексикографически по `intentId`. Этот выбор детерминирован (§9.2 Determinism спеки v1.1) но семантически арбитральный — автор не объявил приоритет между этими intent'ами.

  Теперь каждая такая tied группа фиксируется в `artifact.witnesses[]`:

  ```js
  {
    basis: "alphabetical-fallback",
    reliability: "heuristic",          // НЕ rule-based
    slot: "toolbar",
    projection: "listing_detail",
    salience: 60,
    chosen: "add_listing_image",
    peers: ["add_to_bundle", "apply_template", ...],
    recommendation: "Проставьте intent.salience одному из [...]",
  }
  ```

  **Новый helper:** `detectTiedGroups(sortedItems, { slot, projection })` — чистая функция, возвращает массив witness-записей.

  **Интеграция:**

  - `assignToSlotsCatalog` — после `sort(bySalienceDesc)`, перед overflow cap=5
  - `assignToSlotsDetail.collapseToolbar` — возвращает `{toolbar, witnesses}`
  - `crystallize_v2/index.js` — `slots._witnesses` мержится в `artifact.witnesses[]` перед финальной сборкой артефакта

  **Measurable spec-debt** на 9 reference доменах:

  ```
  Грандтотал: 16 alphabetical-fallback witnesses
    planning/invest/delivery: 0 ✓ чисто
    sales: 7 (listing_detail ×2 — 31-intent tied cluster)
    lifequest: 4, workflow/booking/messenger/reflect: 1-2
  ```

  Studio и lint-инструменты могут подсвечивать эти witnesses как «spec smell». Автор видит, какие intent'ы стоит пометить salience явно, чтобы замкнуть tied choice в свойство спеки, а не эвристику алгоритма.

  **Philosophical.** Это замыкает обещание спеки v1.1 §9.2 на ref-impl: если impl падает в лексикографический tie-break, артефакт **должен** это явно фиксировать. Tied choice, которое раньше было невидимым «я выбрал что-то», теперь first-class witness в format output.

  **Не breaking.** Существующие потребители `artifact.witnesses[]` продолжают работать — новая запись просто добавляется в массив.

  **Тесты.** 5 новых unit-тестов на `detectTiedGroups` (624/624 зелёных).

## 0.16.0

### Minor Changes

- a164717: Функториальность `crystallizeV2` под permutation INTENTS/PROJECTIONS + PoC `intent.salience` как первоклассный tiebreaker.

  **Функториальность (§16).** Результат `crystallizeV2` больше не зависит от порядка авторства ключей INTENTS/PROJECTIONS. Ключи нормализуются алфавитной сортировкой на входе — downstream iteration наследует стабильный порядок. Эмпирическая база (`idf/scripts/functoriality-probe.mjs` на 9 доменах): до фикса 0/9 доменов строго функториальны (121 проекция: 70 identical / 35 order-only / 16 semantic); после фикса — 9/9 строго функториальны.

  **Поведенческое изменение.** Tie-break при slot-contention теперь алфавитный по intentId, а не «порядок авторства». Артефакты могут отличаться от зафиксированных в v0.15: см. snapshot-тесты в потребителях. API совместим.

  **`intent.salience` PoC.** Новый helper `computeSalience(intent, mainEntity)`:

  - Explicit: `intent.salience: number` или `"primary" | "secondary" | "tertiary" | "utility"` (разворачивается в 100/50/20/5)
  - Computed из particles:
    - creator main entity → 80
    - phase-transition (replace `.status` на main) → 70
    - edit main → 60
    - default → 40
    - destructive-main → 30
    - read-only → 10

  PoC scope — только `assignToSlotsDetail.collapseToolbar`: standalone кнопки сортируются `bySalienceDesc` перед срезом capacity=3. Tied salience → alphabetical. Обратная совместимость: 0 обязательных правок existing intent'ов, computed defaults покрывают весь corpus.

  **Философское значение.** Заявление «IDF — формат» держится на том, что crystallize — функция от семантики, не от порядка авторства. До фикса это было ложно эмпирически на всех 9 доменах. Salience делает выбор при slot-contention свойством спеки, а не эвристикой алгоритма — alphabetical становится явным финальным fallback'ом.

  **Roadmap (не в этом релизе):**

  - witness `alphabetical-fallback` — сделать tied salience видимым в `artifact.witnesses[]` как «spec smell»
  - salience в `assignToSlotsCatalog` (capacity=5)
  - `projection.salienceOverride` для multi-projection доменов

## 0.15.0

### Minor Changes

- 519b4b9: Polymorphic entities (v0.15): `entity.discriminator` + `entity.variants` — формализация sum-type сущностей с per-variant UI. Закрывает §26 open item «Composite / polymorphic entities» (from v1.6).

  **Онтология:**

  ```js
  ontology.entities.Task = {
    kind: "internal",
    discriminator: "kind",            // NEW
    variants: {                       // NEW
      story: { label: "Story", fields: { storyPoints: {type:"number"}, criteria: {type:"textarea"} } },
      bug:   { label: "Bug",   fields: { severity: {type:"enum", values:[...]}, stepsToReproduce: {...} } },
    },
    fields: { id, title, kind: {type:"enum"}, ... },  // shared
    ownerField: "assigneeId",
  };
  ```

  **Новые helpers (core):**

  - `parseCreatesVariant("Task(bug)")` → `{entity: "Task", variant: "bug"}`
  - `getVariantFields(entity, variantKey)` → `{fields: merged, warnings}` (shared + variant.fields, shared wins на конфликтах)

  **Crystallize:**

  - `buildCardSpec` emit `{variants: {[k]: spec}, discriminator}` для polymorphic entities. Legacy single cardSpec — для monomorphic.
  - `inferParameters` резолвит variant из `intent.creates`, использует merged fields, добавляет hidden `{name: discriminator, default: variant, hidden: true}` param.
  - Witness `{basis: "polymorphic-variant", pattern: "polymorphic:variant-resolution", reliability: "rule-based"}` в artifact.witnesses для projection с polymorphic mainEntity.

  **Renderer:**

  - `GridCard` в `primitives/containers.jsx` читает `cardSpec.discriminator` + `item[key]` и выбирает `cardSpec.variants[key]` как effective spec. Unknown variant → fallback на first + console.warn. Backward-compat: cardSpec без `.variants` идёт legacy path.

  **Philosophy alignment (манифест):**

  - **§26 closes open item** (перенос из v1.6): «union-типы не формализованы в entity.kind»
  - **§14 ortho axis** — `discriminator` не conflate с `kind` (ownership/authority axis). Precedent: v0.14 `temporality`.
  - **§5 composition** — viewer-scoping через `ownerField` неизменён
  - **§15 witness** — declarative → rule-based, ready для promotion
  - **§16 Pattern Bank** — не используем (нет author-override use-case)
  - **§17 materializations** — pixel fully specialized, agent-API free через existing intent-specialization (creates: "Entity(variant)"), document/voice — v0.2

  **`creates: "Entity(variant)"`** — existing parenthetical-creates (`Vote(yes)`, `Booking(draft)`) уже парсится `normalizeCreates`. Новый `parseCreatesVariant` расширяет для формального резолва variant.

  **Out of scope v0.15:** per-variant detail sections, variant inheritance (`extends`), runtime type-switching, variant-specific invariants, document/voice enhancement.

## 0.14.0

### Minor Changes

- 01bc3a3: Temporal sub-entity kinds (v0.14): `entity.temporality: "snapshot" | "causal-chain"` как ortho axis в онтологии + EventTimeline primitive для inline detail sub-sections.

  **Онтология (core):**

  ```js
  ontology.entities.PaymentEvent = {
    kind: "internal",
    temporality: "causal-chain", // NEW
    ownerField: "paymentId",
    fields: {
      id: {},
      paymentId: { type: "entityRef" },
      kind: { type: "enum" },
      at: { type: "datetime" },
      actor: { type: "entityRef" },
      description: { type: "text" },
    },
  };
  ```

  `temporality` ортогонален `kind`: покрывает time-semantics (snapshot = state at moment, causal-chain = event description). Null = default.

  **Crystallize:** `assignToSlotsDetail.buildSection` автоматически резолвит field-mapping (`atField`/`kindField`/`actorField`/`descriptionField`/`stateFields`) через `inferFieldRole` + name-regex, и записывает `section.renderAs = { type: "eventTimeline", kind, ... }`. Backward-compat: entities без `temporality` — `renderAs` не добавляется, default-path рендера неизменен.

  **Renderer:** новый `EventTimeline` primitive (vertical stepper с dot-markers). 2 kinds:

  - `causal-chain`: `● [kind-badge] actor — description · at`
  - `snapshot`: `● at` → state-fields inline (`label: value`)

  `SubCollectionSection` условный branching: если `section.renderAs.type === "eventTimeline"` — рендерит через primitive, пропуская default path. Экспорт: `import { EventTimeline } from "@intent-driven/renderer"`.

  **Witness-of-crystallization (§15 v1.10):** для каждой temporal sub-section — `{basis: "temporal-section", pattern: "temporal:event-timeline", reliability: "rule-based"}` в artifact.witnesses.

  **Philosophy alignment:** §14 ortho axis (не conflating с kind), §5 composition (events = subCollection projection), §17 pixel-only v0.14 (document/voice enhancement — v0.2), §23 auto-irreversibility — v0.2.

  **Out of scope v0.14:** append-only invariant, auto `__irr` для event-create, section-level field overrides, top-level catalog EventTimeline, document/voice обогащение.

## 0.13.0

### Minor Changes

- 2a0bc87: Multi-archetype views (Scope B): одна projection → N archetype-рендерингов + runtime switcher.

  **New projection API:**

  ```js
  projection: {
    kind: "catalog", mainEntity: "Task", witnesses: [...],
    views: [
      { id: "board", name: "Доска", kind: "catalog", layout: "grid" },
      { id: "table", name: "Таблица", kind: "catalog", layout: "table" },
      { id: "stats", name: "Сводка", kind: "dashboard", widgets: [...] },
    ],
    defaultView: "board",
  }
  ```

  **Artifact new fields:**

  - `views: Array<{id, name, archetype, layout, slots, matchedPatterns, witnesses}> | null`
  - `defaultView: string | null`
  - `viewSwitcher: { views: [{id, name, archetype}], activeId } | null`

  Backward-compat: projection без `views` — artifact.views = null. Existing rendering не затрагивается.

  **Inheritance rules:** view наследует parent projection; overrides — только render-level (`kind`, `layout`, `widgets`, `onItemClick`, `sort`, `patterns`, `strategy`, `name`). Q/W-level (`filter`, `witnesses`, `mainEntity`, `entities`, `idParam`) — запрещены (warning в console + ignored). Archetype whitelist: `catalog`/`feed`/`dashboard` (остальные → fallback + warning).

  **Per-view Pattern Bank.** Каждая view — независимый matching + apply pass. Разные archetype → разные matched patterns (`subcollections` не сматчит dashboard-view).

  **Renderer:** `ProjectionRendererV2` принимает prop `activeView`; подменяет slots/archetype на view's artifact. `ViewSwitcher` primitive — segmented-control для 2-3 views, dropdown для 4+. Экспорт через `import { ViewSwitcher } from "@intent-driven/renderer"`.

  **Materializations (§17):** agent/document/voice используют **default view** only — view это UI-концепт, не data-concept.

  **Philosophy alignment:** §5 composition (views = render-only, Q/W неизменны), §17 пять слоёв (materializations на default), §16 pattern bank (per-view matching).

  **Out of scope:** cross-projection switcher (via `projection.group`), per-user default view (localStorage), `canvas`/`detail`/`form`/`wizard` как view archetypes.

## 0.12.0

### Minor Changes

- 0d49cdf: 4 новые temporal field roles + consumers (closes «белое пятно для дат»).

  **Новые роли в `inferFieldRole`** (priority: timestamp > deadline > scheduled > occurred):

  - `timestamp` — audit/meta: `createdAt`, `updatedAt`, `deletedAt`, `modifiedAt`, `lastSeenAt`, `archivedAt`. Renderer: мелкий серый текст.
  - `deadline` — target date, может быть overdue: `due*`, `deadline*`. Renderer: badge в monitoring/triage.
  - `scheduled` — планируемое будущее: `scheduled*`, `appointment*`, `meeting*`, `visitDate`, `eventDate`, `sessionAt`. Renderer: secondary (countdown-ready).
  - `occurred` — прошедшее событие: past-tense verbs (`started*`, `completed*`, `finished*`, `closed*`, `posted*`, `ended*`, `administered*`, `recorded*`, `shipped*`, `opened*`, `logged*`, `received*`), `record*`, `birthDate`. Renderer: secondary (timeline-anchor).

  **Breaking (minor):** `timer` regex сужен с `/end|deadline|expir/` до `/^(expir|countdown)/` + `/Until$/`. Поля `deadline*` переезжают с `timer` на `deadline`. Affected fields:

  - `auctionEnd`, `endAt`, `endDate` (без past-tense `ed`) → раньше `timer`, теперь `info` fallback. Workaround: explicit `fieldRole: "timer"`.
  - `deadline` → раньше `timer`, теперь `deadline` (badge вместо Timer-countdown).
  - `expiresAt`, `expiryDate`, `validUntil` → остаются `timer`.

  Domains в idf/ с `deadline`-полями (invest.Goal, lifequest.Goal, planning.Poll) получают новое поведение: вместо Timer-countdown — badge.

  **Consumers:**

  - `strategy.js` — monitoring: `deadline` → badge, `scheduled`/`timestamp` → secondary. triage: `deadline` → badge.
  - `deriveShape.isDateField` — делегирует в `inferFieldRole` (удалён локальный `DATE_FIELD_HINTS`).

  Witness-labeling (§15 v1.10) — каждое temporal-правило эмитит `reliability: "heuristic"` + `pattern: "temporal:*"`. Стабильные grouping keys, готовые к промоции в `ontology.fieldPatterns` (§26 zazor #3 phase 2).

  **Philosophy alignment:** §4 (темпоральные предикаты — deadline/scheduled готовы к `now`-relative conditions), §15 (pattern promotion), §21 (Timer primitive breaking change задокументирован).

  **Out of scope v0.12:** `checkpoint` role, `duration` (start+end pair), `RelativeTime`/`DeadlineBadge` primitives, выделение Events/Deadlines секций в detail. См. `docs/superpowers/specs/2026-04-18-temporal-field-roles-design.md`.

## 0.11.0

### Minor Changes

- 988bfe4: Hub-absorption (R8) + shape-layer в crystallize_v2 — снимает монотонность «много flat tabs × hero-create везде» в CRUD-доменах.

  **R8 Hub-absorption** (`absorbHubChildren`): child-каталоги с FK на entity с detail-проекцией автоматически помечаются `absorbedBy: "<parent>_detail"` и добавляются в `hubSections: [{ projectionId, foreignKey, entity }]` на hub-detail. Threshold — ≥2 child-каталога (меньше не оправдывает иерархии). Author-override: `projection.absorbed: false`.

  **Shape-layer** (`deriveShape`): вывод визуального shape'а для catalog/feed поверх archetype:

  - `timeline` — date-witness + descending sort (хронологии вроде health_feed).
  - `directory` — contact-поля (phone/email/address) без date-sort (адресные книги).
  - `default` — fallback.

  Author-override: `projection.shape`. Результат в `artifact.shape` + `artifact.shapeSignals`, shape !== default также пишется в `slots.body.shape` для renderer.

  **Hero-create guard**: для `timeline` и `directory` creator не идёт в hero-слот, а в toolbar — хронологии и контакты не должны визуально доминировать над созданием.

  **Новые поля artifact**: `absorbedBy`, `hubSections`, `shape`, `shapeSignals`. Также `slots.hubSections` в detail-архетипе (hook для будущего rendering v0.2).

## 0.10.1

### Patch Changes

- 2827db9: fix(patterns): корректные projection names в falsification для 7 golden patterns

  В v0.10.0 `shouldMatch` / `shouldNotMatch` для 7 новых golden-паттернов
  ссылались на projection names, которых нет в реальных IDF-доменах
  (`listings_catalog` vs `listing_feed`, `habits_root` vs `habit_list`,
  `workflow_runs` vs `execution_log` и т.д.). После прогона
  `matchPatterns()` на всех 9 доменах через `scripts/match-golden-
patterns.mjs` в idf repo (2026-04-18) исправил:

  - `global-command-palette`: sales/listing_feed, messenger/conversation_list, booking/review_form
  - `optimistic-replace-with-undo`: lifequest/habit_list, lifequest/dashboard, planning/poll_overview
  - `bulk-action-toolbar`: переоптимизирован — только messenger/conversation*list (единственный домен с фактическими bulk*\*-intents)
  - `kanban-phase-column-board`: workflow/execution_log, sales/listing_feed, delivery/orders_feed
  - `keyboard-property-popover`: sales/listing_detail, lifequest/goal_detail, lifequest/habit_detail
  - `observer-readonly-escape`: упрощён — aspirational shouldMatch на invest/alert_detail, явно задокументирован
  - `lifecycle-locked-parameters`: booking/booking_detail, delivery/order_detail, sales/listing_detail

  Фактические результаты matching на 9 доменах (после фикса):

  - `global-command-palette`: 106 hits
  - `optimistic-replace-with-undo`: 67 hits
  - `kanban-phase-column-board`: 21 hits
  - `bulk-action-toolbar`: 15 hits
  - `keyboard-property-popover`: 11 hits
  - `lifecycle-locked-parameters`: 8 hits
  - `observer-readonly-escape`: 0 hits (aspirational — нужно добавить observer-role с high-irreversibility intents)

  Содержимое patterns (trigger / structure / rationale) не менялось — только
  falsification section, что исправляет schema-тест без изменения поведения.

## 0.10.0

### Minor Changes

- c413d3d: feat(patterns): 7 новых stable-паттернов из golden-standard batch

  Pattern Bank растёт с 13 до **20 stable patterns** после исследования 5
  золотых стандартов (Linear / Stripe / Notion / Height / Superhuman)
  через `scripts/pattern-researcher-batch.mjs` (51 candidate, 7
  promoted).

  Cross-archetype (overlay-слой поверх любой projection):

  - `global-command-palette` — ⌘K overlay для ≥15 intents. Конвергентный
    signal: Linear, Height, Superhuman (3 независимых match'а).
  - `optimistic-replace-with-undo` — дуал к `irreversible-confirm`. Для
    частых reversible replace-ops (≥3 click-confirmation): undo-toast
    вместо modal. Signal: Linear property changes, Superhuman archive.
  - `bulk-action-toolbar` — selection-triggered action bar, если домен
    объявляет ≥2 `bulk_*` intents. Signal: Height, Linear Triage, Gmail.

  Catalog:

  - `kanban-phase-column-board` — catalog-версия `phase-aware-primary-cta`.
    Триггер: status-field с ≥3 enum + replace-intents на `.status`.
    Apply (v1.13+): body.layout={type:"kanban", columnField:"status"}.

  Detail:

  - `keyboard-property-popover` — Linear-style sidebar. ≥4 replace-
    intents на mainEntity.\* + click-confirmation. Inline-popover с
    type-specific picker + single-letter hotkey.
  - `observer-readonly-escape` — observer-role + ≥1 high-irreversibility
    intent → единый primary CTA (Dispute/Escalate/Flag). Signal: Stripe
    payment-detail, invest alert-detail.
  - `lifecycle-locked-parameters` — писаемы в draft-фазе, read-only
    после активации. Signal: Stripe subscription, IDF AgentPreapproval.

  Каждый паттерн содержит rationale.evidence (источники signal'а),
  counterexample (когда НЕ применим), falsification.shouldMatch /
  shouldNotMatch (реальные domain+projection pairs из IDF prototype).

  Отчёт с полной кластеризацией 51 кандидата: см. idf/refs/2026-04-18-
  FINAL-REPORT.md.
  EOF

  Следующий шаг — прогон через matchPatterns() на 9 доменах IDF,
  фактическая валидация shouldMatch/shouldNotMatch, apply-функции для
  3-4 паттернов (planned v0.11).

## 0.9.1

### Patch Changes

- 9b8f413: fix(agent): collection naming canonical camelCase + ISO-expiresAt tolerant

  Два исправления в slice'е agent-layer:

  - `filterWorldForRole` → `findCollection` теперь пробует коллекции в порядке
    camelCase → lowercase → last-segment (booking legacy `slots`). `outputName`
    всегда canonical camelCase (`agentPreapprovals`, `riskProfiles`, `timeSlots`)
    — это public namespace для агента. Раньше outputName был lowercase, и
    консьюмеры видели `world.agentpreapprovals` для одного entity и
    `world.riskProfiles` (из seed) для другого — inconsistent.
  - `checkPreapproval` → `getPreapprovalRow` получил тот же fallback lookup
    (camelCase → lowercase). `notExpired` check теперь принимает ISO-string
    для `expiresAt` через `Date.parse()` fallback — возвращает
    `invalid_expiresAt` только если не number и не parseable string. Раньше
    `Number("2026-10-14T05:48:42Z")` давал NaN и check ошибочно falsebly
    падал на "expired".

  Breaking-change-note для консьюмеров: если клиент читал
  `world.agentpreapprovals` (legacy lowercase output), нужно переключиться
  на `world.agentPreapprovals`. Prototype-side миграция в сопутствующем PR.

## 0.9.0

### Minor Changes

- 4142c3d: Pattern Bank: первая волна `structure.apply` + `explainMatch` + first-class witnesses.

  **@intent-driven/core** (minor):

  - Новая точка `explainMatch(intents, ontology, projection, options)` — единая SDK-surface для authoring-env tooling (Studio viewer + prototype inspector). Возвращает archetype, behavioral (resolvePattern), structural (matched + nearMiss), witnesses, artifactBefore/After, previewPatternId.
  - `evaluateTriggerExplained` — per-requirement breakdown trigger'а. `evaluateTrigger` остаётся wrapper'ом.
  - `matchPatterns(intents, ontology, projection, { includeNearMiss })` — расширенная форма возвращает `{ matched, nearMiss }` с entries вида `{ pattern, explain, missing }`. Legacy shape (array) — без изменений при отсутствии options.
  - `structure.apply(slots, context)` — чистая функция в паттернах, обогащает slots при кристаллизации. Реализовано для 3 паттернов:
    - `subcollections` — добавляет sub-entity секции в detail-архетипе (FK-based auto-discovery с last-camelCase-segment fallback, pluralization y→ies / is→es / s,x,z,ch,sh+es).
    - `grid-card-layout` — выставляет `body.layout="grid"` + cardSpec из witnesses для catalog. Author-override: любой `body.layout` — no-op.
    - `footer-inline-setter` — single-replace intents перемещаются в footer как inline-setters. Author-override: существующие footer items не перетираются.
  - `applyStructuralPatterns(slots, matched, context, preferences, registry)` — встроено в crystallize pipeline (внутри шага 3). Feature-flag `ontology.features.structureApply` как kill-switch.
  - `projection.patterns: { enabled, disabled }` — author-level preference для force-apply / force-skip паттерна. Часть input'а кристаллизации, не snapshot артефакта (§16 перегенерируемость).
  - `artifact.witnesses[]` — pattern matching как first-class §15 finding c `basis: "pattern-bank"`, `reliability: "rule-based"`, `requirements: [{ kind, ok, spec }]`.
  - Helpers `findSubEntities`, `buildSection`, `sectionIdFor`, `buildCardSpec` — экспортированы для переиспользования.

  **@intent-driven/renderer** (minor):

  - `ProjectionRendererV2` prop `artifactOverride` — dev-only override (§27 authoring-env). Приоритетнее штатного `artifact`. Когда задан — используется напрямую; когда отсутствует — поведение без изменений.
  - `ProjectionRendererV2` prop `previewPatternId` — передаётся в ctx для overlay над derived-слотами.
  - Новый primitive `PatternPreviewOverlay` — dashed-border + corner-badge с pattern id. Применяется в `SlotRenderer` и `ArchetypeDetail` для слотов с `source: "derived:..."` когда `previewPatternId` активен.

  **Обратная совместимость:**

  - Все новые поля артефакта (`witnesses`, `pattern`, `body.layout`, `body.cardSpec`, `slots.sections[].source`) — additive.
  - `matchPatterns` legacy array-shape сохранён.
  - `evaluateTrigger` работает идентично.
  - `structure.apply` опциональное — паттерны без него продолжают работать только как matching-only.

## 0.8.0

### Minor Changes

- feat: UX Pattern Layer + Pattern Bank + 3 Gravitino patterns

  - UX Pattern Layer: 5 behavioral patterns (monitoring/triage/execution/exploration/configuration), signal classifier, rendering strategy
  - Pattern Bank: 13 stable structural patterns с trigger/structure/rationale triple, falsification framework, 9 trigger kinds
  - Claude Researcher Pipeline integration: 3 patterns extracted from Apache Gravitino WebUI (hierarchy-tree-nav, discriminator-wizard, m2m-attach-dialog)
  - matchedPatterns field в артефакте кристаллизатора
  - 410 тестов core pass, полная обратная совместимость

## 0.7.2

### Patch Changes

- 7f60b09: feat: публичный экспорт `inferFieldRole` для внешних консументов (zazor #3 analyzer)

  `inferFieldRole` ранее был доступен только через internal `crystallize_v2/ontologyHelpers.js`. Нужен для batch analyzer (`scripts/zazor3-candidates.mjs` в прототипе), который группирует heuristic findings по `witness.pattern`. Additive, не breaking.

## 0.7.1

### Patch Changes

- 6f09f57: feat: публичный экспорт `inferFieldRole` для внешних консументов (zazor #3 analyzer)

  `inferFieldRole` ранее был доступен только через internal `crystallize_v2/ontologyHelpers.js`. Нужен для batch analyzer (`scripts/zazor3-candidates.mjs` в прототипе), который группирует heuristic findings по `witness.pattern`. Additive, не breaking.

## 0.7.0

### Minor Changes

- b6a62e7: feat: witness.pattern — formal grouping key для heuristic findings (§15 v1.10 zazor #3 phase 1)

  - `witness.pattern: string` добавлен в finding/evidence shape (additive, optional).
  - `inferFieldRole` эмитит pattern для всех 12 heuristic branches: `name:title-synonym`, `name:description-synonym`, `name:price-substring`, `name:timer-suffix`, `name:coordinate-set`, `name:address-suffix`, `name:zone-set`, `name:location-set`, `name:badge-status`, `type:number-metric-fallback`, `fallback:info`.
  - `computeAlgebraWithEvidence` эмитит `pattern: "antagonist-declared"` для heuristic-lifecycle entries.
  - Structural / rule-based findings: pattern optional (не требуется — они уже named через свой тип).

  **Convention:** `reliability: "heuristic"` → `witness.pattern` обязано быть заполнено. Linter-enforcement — open task v1.11+.

  Prerequisite infrastructure для zazor #3 phase 2 (promotion writer): analyzer группирует heuristic occurrences по formal pattern без string-parsing basis'ов.

## 0.6.0

### Minor Changes

- daadd3d: feat: witness-of-proof filling (§15 zazor #2)

  - `checkAnchoring` заполняет `reliability` (structural / rule-based / heuristic) и `witness.basis` для всех findings (entity / effect.target / field / witness / condition).
  - `computeAlgebraWithEvidence` добавляет `reliability` alias над существующим `classification` + `witness.basis`.
  - `inferFieldRole` теперь возвращает `{role, reliability, basis}` вместо `string` (internal breaking — 4 call sites в crystallize_v2 мигрированы в этом же релизе). External consumers: обновить `const r = inferFieldRole(...)` → `const r = inferFieldRole(...)?.role`.

  Reliability taxonomy:

  - `structural` — прямая decidable привязка или exhaustive exhaustion для MISS.
  - `rule-based` — через объявленное правило (computePlural, type-based, ontology.invariants).
  - `heuristic` — name-convention без формального правила.

  Runtime `effect.context.__witness` convention вводится в потребляющих репозиториях (scheduler / Rules Engine / invariant checker) — не часть SDK. Поле `witness.counterexample` остаётся зарезервированным (v1.10+).

  **Reliability расширяет capability surface family** (§26 v1.6 #2 insight): `entity.kind` / `role.scope` / `adapter.capabilities` / `reliability` — четвёртый член. Эпистемическая capability, complementary к структурным. Prerequisite infrastructure для zazor #3 (heuristic-once → implication rule).

## 0.5.1

### Patch Changes

- 550d9c2: fix(anchoring): корректная plural-резолюция как в buildTypeMap

  Наивный `endsWith("s") ? slice(0,-1) : name` давал ложные error'ы для
  "activities" → "activitie", "addresses" → "addresse", "deliveries" → "deliverie".
  Теперь `checkAnchoring` использует тот же алгоритм, что `buildTypeMap` в fold.js:
  y → ies, s → ses, иначе + s. Построен collection-lookup: каждая entity
  регистрируется и под singular-именем, и под своей plural-формой.

  Найдено аудитом прототипа (sales, reflect, delivery, invest, messenger) — 80%
  из 134 "errors" были артефактом баги, не реальными ontology gaps.

## 0.5.0

### Minor Changes

- 8b2c20e: feat: binary anchoring gate (§15 zazor #1) — Phase 1

  - Добавлены `checkAnchoring(INTENTS, ONTOLOGY)` и `AnchoringError`.
  - `crystallizeV2` принимает `opts.anchoring: "strict" | "soft"`. Default — `"soft"` в этом релизе (не breaking).
  - `ontology.systemCollections: string[]` — декларация коллекций без доменной сущности (`drafts`, `users`, `scheduledTimers`) для подавления anchoring errors.
  - `checkIntegrity` rule #6 делегирует `checkAnchoring`, back-compat сохранён.
  - Классификация частиц: конструктивные (entity, effect.target base) → error; описательные (field, witness, condition) → warning/info.

  Phase 3 (следующий major) переключит default на `strict` — все потребители получат явную миграционную заметку.

## 0.4.0

### Minor Changes

- 72d1033: Координированный minor-bump всего семейства `@intent-driven/*` для согласованного версионирования публичного npm-релиза.

## v0.3.0 — 2026-04-15

**Asset-boundary, необратимость, temporal scheduler — полевой тест 11 (delivery) + Consolidation Sprint 1.**

### Added

**§19 — Asset-boundary (v1.7 terminological):**

- `ASSET_KINDS` — перечень допустимых видов внешних активов в онтологии
- `getAssets(ontology)` — возвращает `ontology.assets[]`
- `validateAsset(asset)` — валидирует декларацию актива `{ valid, errors }`

**§23 — Необратимость (closure):**

- `mergeIntoContext(context, irrDef)` — добавляет `__irr: { point, at, reason }` к контексту эффекта zero-migration через JSON-поле
- Integrity-правило в validator.js блокирует `α:"remove"` на сущностях с past confirmed high-irr эффектом
- Forward-correction через `α:"replace"` разрешён всегда

**§4 — Temporal scheduler (v1.7):**

- Системные намерения `schedule_timer(afterMs|atISO, target, revokeOn?)` и `revoke_timer(timerId)` — задокументированы как часть core-парадигмы
- `evaluateScheduleV2` parser: `after:"5m"` / `at:"ISO"` / `revokeOn:[patterns]`

### Design notes

Все три дополнения v1.7 применяются совместно в домене delivery (field-test-11). Нет breaking changes — расширение через новые export-пути `./ontology/assets` и `./irreversibility`.

---

## v0.2.0 — 2026-04-14

**Agent layer + materializations extraction from IDF prototype v1.6.2.**

Расширяем ядро модулями, которые окончательно стабилизировались в v1.6
после закрытия 6 §26 open items. Полное покрытие §1 четырёх
материализаций + §5 ролевая таксономия + §14 глобальные инварианты

- §17 agent layer guards.

### Added

**§5 / §17 — Agent layer helpers:**

- `filterWorldForRole(world, ontology, role, viewer)` — viewer-scoped filter с поддержкой many-to-many через `role.scope` (via/viewerField/joinField/localField/statusAllowed), single-owner через `entity.ownerField`, и reference entities через `entity.kind: "reference"` (§5)
- `checkPreapproval(intentId, params, viewer, ontology, world, role)` — декларативные лимиты для агента поверх JWT. 5 типов предикатов: `active`, `notExpired`, `maxAmount`, `csvInclude` (с `allowEmpty`), `dailySum` (с sum-filter) (§17)
- `BASE_ROLES = ["owner", "viewer", "agent", "observer"]` — таксономия базовых ролей (§5 v1.6.1)
- `validateBase`, `getRolesByBase`, `isAgentRole`, `isObserverRole`, `isOwnerRole`, `auditOntologyRoles` — helpers для cross-domain инструментов и SDK defaults

**§1 — Материализации (три новых кроме pixels):**

- `materializeAsDocument(projection, world, viewer, opts)` — generic document-граф для любой projection (catalog/feed/detail/dashboard). Поддержка sub-collections (§1 v1.6)
- `renderDocumentHtml(doc)` — print-ready HTML с inline стилями
- `materializeAsVoice(projection, world, viewer, opts)` — speech-script с turns: `system` / `assistant` / `prompts`. Brevity-heuristics: top-3 catalog, money «2.5 миллионов рублей», русские числительные (§1 v1.6.2)
- `renderVoiceSsml(script)` — SSML XML для TTS-движков (Polly/Yandex SpeechKit)
- `renderVoicePlain(script)` — plain text для debug / IVR baseline

**§14 — Global invariants (v1.6.1):**

- `checkInvariants(world, ontology, opts)` — dispatch по kind, возвращает `{ok, violations}`
- `registerKind(name, handler)` — расширение своим kind'ом
- `KIND_HANDLERS` — встроенные: `role-capability`, `referential`, `transition`, `cardinality`, `aggregate`

### Design notes

Все новые модули — **pure functions** без side effects. Работают над любым domain ontology с корректной декларацией. Backcompat: модули без role.scope / preapproval / invariants / entity.kind продолжают работать как в v0.1.

**Materializations symmetry (§1 proof-of-concept):** все три materializer'а (`document`, `voice`, agent-API в routes) reuse `filterWorldForRole` — viewer-scoping одинаковое. Четыре материализации pixels/voice/agent-API/document — равноправные рендеры одной artifact-модели v2.

### Tests (в prototype)

SDK-extracted модули покрыты тестами в основном repo (будет мигрировано в SDK в v0.3):

- filterWorld: 20 unit-тестов (в т.ч. m2m через assignments)
- baseRoles: 26 unit-тестов + все 8 доменов имеют валидный base
- preapprovalGuard: 16 unit-тестов
- documentMaterializer: 15 unit-тестов
- voiceMaterializer: 17 unit-тестов
- invariants: покрытие через invariantChecker.test.js

Итого: **371 unit-тест** в prototype, ~ 110 — в extracted модулях.

### Build

- Dual ESM + CJS через tsup (без изменений)
- TypeScript types auto-generated
- Нет breaking changes в существующих экспортах

---

## v0.1.0 — 2026-04-14

**Initial extraction from IDF prototype v1.5.**

### Includes

- `useEngine(domain)` — главный React hook
- `fold`, `foldDrafts`, `applyPresentation`, `buildTypeMap`, `filterByStatus` — fold эффектов
- `causalSort` — топологическая сортировка по parent_id
- `computeAlgebra`, `computeAlgebraWithEvidence`, `normalizeEntityFromTarget` — intent algebra (§12)
- `checkComposition` — алгебра композиции α⊗α
- `checkIntegrity` — 7 правил целостности
- `parseCondition`, `parseConditions` — парсер string conditions
- `crystallizeV2` — кристаллизация артефактов проекций
- `validateArtifact` — валидация артефакта v2
- `generateEditProjections`, `findReplaceIntents`, `buildFormSpec` — auto-generated edit-формы
- `registerArchetype`, `prependArchetype`, `selectArchetype`, `getArchetypes` — control-архетипов registry

### Build

- Dual ESM (117KB) + CJS (119KB) via tsup 8.5
- TypeScript types (.d.ts, 155KB) auto-generated из JSDoc + JS files

### Tested

- 238 unit-тестов проходят
- IDF prototype v1.5 — protokol of 7 доменов, 481 намерение
