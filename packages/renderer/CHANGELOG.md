# Changelog

## 0.15.1

### Patch Changes

- a5ac702: ArchetypeDetail: при singleton-detail без target рендер creator-intent CTA под
  EmptyState. Закрывает freelance backlog §3.6 — my_wallet_detail у customer без
  Wallet больше не dead-end, top_up_wallet_by_card доступен через IntentButton.

## 0.15.0

### Minor Changes

- 7600533: feat(parameter): `parameter.help` — contextual hint под параметром (UI-gap #7, Workzilla-style).

  Декларация inline hint-card:

  ```js
  { name: "budget", type: "number", fieldRole: "price",
    help: {
      title: "Какую стоимость поставить?",
      text: "Укажите стоимость, которую готовы заплатить за задание. Важно, чтобы цена соответствовала объёму работы.",
      icon: "💡",  // опц., дефолт "💡"
    },
  }
  ```

  Shortcut: `help: "строка"` → treated as `{ text: "строка" }`.

  Renderer: ParameterControl оборачивает Component + optional PresetChips + optional HelpCard. HelpCard — compact card с `role="note"` под input (+ presets если есть).

  CSS vars: `--idf-surface-soft` / `--idf-accent-soft` / `--idf-text` / `--idf-text-muted` через Token Bridge — автоматически вписывается в 4 UI-kit'а.

  Side-card layout (floating справа от form'ы, как в workzilla-create-task-form) — follow-up, требует form-layout awareness в ArchetypeForm.

  Тесты: +9 в `HelpCard.test.jsx` (6 unit + 3 ParameterControl integration). 194 renderer passing.

## 0.14.0

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

## 0.13.0

### Minor Changes

- 2a86bac: feat(parameter): `parameter.presets` — quick-value chips (UI-gap #3, Workzilla-style).

  Авторы могут декларировать быстрые значения на параметре:

  ```js
  { name: "budget", type: "number", fieldRole: "price",
    presets: [
      { label: "500 ₽", value: 500 },
      { label: "1500 ₽", value: 1500 },
      { label: "5000 ₽", value: 5000 },
    ],
  }
  ```

  Или shortcut form (preset as plain value, label = String(value)):

  ```js
  { name: "retries", type: "number", presets: [1, 3, 5, 10] }
  ```

  Renderer: ParameterControl оборачивает Component + PresetChips (ряд кликабельных button'ов под input'ом). Click на chip → `onChange(preset.value)`. Active-state подсвечивается когда текущий value совпадает с preset.value (aria-pressed).

  Preset-capable control types: `text` / `email` / `tel` / `url` / `number` / `datetime`. File / image / multiImage — skip (нет "значения" в обычном смысле).

  PresetChips использует Token Bridge CSS vars (`--idf-accent` / `--idf-surface-soft` / `--idf-text-muted` / `--idf-border`) — корректно вписывается в 4 UI-kit'а.

  Мотивация: скриншоты Workzilla — quick-chip'ы "Через 2 часа / 6 часов" на deadline, "500 / 1500" на budget. 8 тестов (`PresetChips.test.jsx`).

## 0.12.1

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

## 0.12.0

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

## 0.11.0

### Minor Changes

- f5296f9: X-ray режим в `PatternPreviewOverlay` (warm-yellow border + hover-popover с trail требований + Open in Graph3D ссылка). `ProjectionRendererV2` принимает props `xrayMode`, `slotAttribution`, `xrayDomain`, `onExpandPattern`, `patternWitnesses` — пробрасывает в ctx, `ArchetypeDetail` оборачивает derived sections при включённом xray (поиск по `slots.sections[idx]` в attribution map, fallback через `section.source: "derived:<patternId>"`). Backward-compatible: без новых props поведение не меняется.

## 0.10.0

### Minor Changes

- eb2954d: feat(renderer): R9 end-to-end — List и ArchetypeDetail auto-enrich items через compositions

  Renderer теперь auto-обогащает items alias-полями из `artifact.compositions` (R9)
  используя `resolveCompositions` / `resolveItemCompositions` из
  `@intent-driven/core`.

  **Изменения**:

  - `List` primitive (catalog/feed body) — вызывает `resolveCompositions(items,
compositions, world)` ДО filter/sort/render. Это позволяет filter и sort
    использовать aliased paths ("customer.name", "task.title") прозрачно.
  - `ArchetypeDetail` — вызывает `resolveItemCompositions(target, compositions, world)`
    при сборке target'а. Detail-проекции с compositions видят alias-поля в slots.

  Backward compat: если `artifact.compositions` отсутствует или пуст —
  поведение не меняется, zero overhead.

  **Зависимость**: `@intent-driven/core >= 0.17` (PR #65 + #67).

  Завершает R9 end-to-end chain:

  1. Crystallize — R9 добавляет `proj.compositions` (core #65)
  2. Runtime — `resolveCompositions` (core #67)
  3. **Renderer — List + ArchetypeDetail используют это автоматически** (этот PR)

  Теперь автор может объявить `ontology.compositions.Deal = [{entity: "Task", ...}]`,
  указать `witnesses: ["task.title", "customer.name"]` в projection — и всё
  рендерится без ручного join в domain code.

  Тесты: +3 в `containers.r9.test.jsx` (enrichment + filter, backward compat,
  empty items). 116/116 renderer tests зелёные.

## 0.9.0

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

## 0.8.0

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

## 0.7.0

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

## 0.6.0

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

## 0.5.0

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

## 0.4.0

### Minor Changes

- 72d1033: Координированный minor-bump всего семейства `@intent-driven/*` для согласованного версионирования публичного npm-релиза.

## 0.3.0

### Minor Changes

- 9f643b6: Расширение Dashboard-архетипа двумя новыми формами виджетов и новый primitive `EmptyState`.

  **Dashboard widgets** — теперь поддерживаются три формы:

  - `{ projection }` — embedded ProjectionRendererV2 (как раньше)
  - `{ aggregate, key, title, unit? }` — скалярный агрегат через мини-DSL: `sum(orders, total, status=completed)` / `count(orders)` / `avg(rates, value, region=eu)`. Поддерживаются операторы `=`, `!=`, `>`, `<`, `>=`, `<=`, литералы, `viewer.x`, `today`, `now`.
  - `{ inline: { entity, filter, sort } }` — встроенный мини-список без отдельной проекции.

  Чистые хелперы вынесены в `archetypes/dashboardWidgets.js` (parseAggregate / evalAggregate / matchFilter / resolveRhs / formatScalar / sortItems / toCollection) и покрыты unit-тестами.

  **EmptyState primitive** — унифицированная заглушка `{title, hint, icon, size}` для «ничего нет» / «не найдено». Заменяет inline empty-ветки в Detail / Form / Dashboard. В Detail/Form различаются два случая: «id не выбран → подсказка выбрать» vs «id есть, но не нашли → возможно удалено».

## 0.2.0 — 2026-04-15

**Map primitive + IrreversibleBadge — полевой тест 11 (delivery) + Consolidation Sprint 1.**

### Added

**§16a — Map primitive (v1.7):**

- `map` primitive — spatial primitive-категория по образцу chart. 4 layer kinds: `marker` / `route` / `polygon` / `heatmap`
- SVG-fallback встроен (`calcBounds` / `projectPoint` / `normalizeLayer` — pure functions)
- Adapter-delegation через `getAdaptedComponent("primitive","map")`
- Semantic field роли `coordinate` / `address` / `zone` в `inferFieldRole`
- Применение: 3 canvas в delivery (`order_tracker` / `dispatcher_map` / `active_delivery`)

**§23 — IrreversibleBadge primitive (v1.7):**

- `irreversibleBadge` в `PRIMITIVES` — визуальный маркер точки невозврата
- Props: `point` ("high"|"medium"), `at` (ISO timestamp), `reason` (string)
- Применение: `capture_payment` в delivery

### Changed

- `primitives/index.js` — добавлены `map` и `irreversibleBadge` в `PRIMITIVES`

---

## 0.1.0 — 2026-04-15

- Первый релиз: `ProjectionRendererV2`, `SlotRenderer`, `ErrorBoundary`
- 7 архетипов: feed / catalog / detail / form / canvas / dashboard / wizard
- 11 control-компонентов: Composer, FormModal, ConfirmDialog, IntentButton, Overflow, InlineSearch, BulkWizard, Toggle, OverlayManager, HeroCreate, capture/\*
- Primitives: atoms (12), containers (4), chart / sparkline
- Реестр адаптеров: `registerUIAdapter`, `getAdaptedComponent`, `getCapability`, `supportsVariant`
- 36 unit-тестов
