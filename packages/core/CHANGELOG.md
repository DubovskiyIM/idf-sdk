# Changelog

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
