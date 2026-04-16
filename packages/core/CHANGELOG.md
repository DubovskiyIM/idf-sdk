# Changelog

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
