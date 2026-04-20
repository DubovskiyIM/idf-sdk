# Changelog

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
