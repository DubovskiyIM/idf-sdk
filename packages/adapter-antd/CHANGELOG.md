# Changelog

## 1.9.0

### Minor Changes

- c708b22: feat(blockeditor): primitive `BlockEditor` через adapter capability (§12.10)

  Закрывает SDK backlog §12.10 (Notion field-test). Renderer экспортирует
  `<BlockEditor>` primitive, который резолвит реализацию через
  `adapter.capabilities.primitive.blockEditor`. Если адаптер декларирует
  capability + регистрирует `primitive.blockEditor` — рендерится adapter-component
  (passing through `blocks`, `onChange`, `onSlashCommand`, `onIndent`,
  `onOutdent`, `onKindChange`, `readOnly`, `capability`). Иначе — read-only
  структурный fallback (заголовки + иерархия, без редактирования).

  `adapter-antd` декларирует reference impl: textarea per block + Select для kind,
  `kinds: ["paragraph","heading-1..3","bulleted/numbered-list-item","to-do",
"quote","callout","divider","code"]`, `slashCommands/indent/dragHandles/
inlineFormatting: false`. Это намеренный минимум — для полноценного UX
  host регистрирует Tiptap/BlockNote/Lexical-обёртку с тем же contract'ом.

  Дизайн сохраняет reader-симметрию (§23 axiom 5): voice/agent/document
  материализуют block-tree из Φ через ontology, pixels-reader делегирует
  визуализацию выбранной библиотеке. Renderer-bundle не растёт на размер
  editor-зависимостей.

## 1.8.3

### Patch Changes

- bd204be: feat(adapters): `capabilities.interaction.externalSelection` + `useCoSelectionEnabled`

  Третий из трёх promotion-gate'ов для `bidirectional-canvas-tree-selection`
  (candidate → stable). Adapter opt-in capability флаг + canonical gate hook
  для canvas/map-primitives.

  **Adapter declaration (все 4 bundled):**

  ```js
  capabilities: {
    interaction: { externalSelection: false },  // opt-in когда появится canvas
    // ...
  }
  ```

  Все 4 bundled-адаптера (antd/mantine/apple/shadcn) декларируют `false` —
  нет native canvas с selection-прокидыванием. Custom адаптеры с canvas-
  primitive поднимают флаг в `true` для включения bidirectional-binding.

  **Renderer gate hook:**

  ```jsx
  import { useCoSelectionEnabled } from "@intent-driven/renderer";

  function CanvasPeer() {
    const enabled = useCoSelectionEnabled();
    // true iff: CoSelectionProvider смонтирован +
    //           adapter.capabilities.interaction.externalSelection === true
    if (!enabled) return <CanvasReadonly />; // fallback
    return <CanvasBidirectional />; // full co-selection
  }
  ```

  Unknown capability (provider есть, но adapter не декларирует) → `false`:
  co-selection — opt-in, не opt-out (безопасно по умолчанию).

  9 новых тестов в `coSelection.test.jsx`: capability gate (provider-only,
  capability-only, both, unknown, missing-capabilities), bundled-adapter
  opt-out (×4). Full renderer: 560/560, adapter-suites: 60/60 зелёные.

## 1.8.2

### Patch Changes

- bd204be: feat(adapters): `capabilities.interaction.externalSelection` + `useCoSelectionEnabled`

  Третий из трёх promotion-gate'ов для `bidirectional-canvas-tree-selection`
  (candidate → stable). Adapter opt-in capability флаг + canonical gate hook
  для canvas/map-primitives.

  **Adapter declaration (все 4 bundled):**

  ```js
  capabilities: {
    interaction: { externalSelection: false },  // opt-in когда появится canvas
    // ...
  }
  ```

  Все 4 bundled-адаптера (antd/mantine/apple/shadcn) декларируют `false` —
  нет native canvas с selection-прокидыванием. Custom адаптеры с canvas-
  primitive поднимают флаг в `true` для включения bidirectional-binding.

  **Renderer gate hook:**

  ```jsx
  import { useCoSelectionEnabled } from "@intent-driven/renderer";

  function CanvasPeer() {
    const enabled = useCoSelectionEnabled();
    // true iff: CoSelectionProvider смонтирован +
    //           adapter.capabilities.interaction.externalSelection === true
    if (!enabled) return <CanvasReadonly />; // fallback
    return <CanvasBidirectional />; // full co-selection
  }
  ```

  Unknown capability (provider есть, но adapter не декларирует) → `false`:
  co-selection — opt-in, не opt-out (безопасно по умолчанию).

  9 новых тестов в `coSelection.test.jsx`: capability gate (provider-only,
  capability-only, both, unknown, missing-capabilities), bundled-adapter
  opt-out (×4). Full renderer: 560/560, adapter-suites: 60/60 зелёные.

## 1.8.1

### Patch Changes

- 491d8a3: AntdOverflowMenu: stopPropagation на trigger и menu items. Без фикса клик по ⋮ в Card бабблит до row-onClick → navigate открывает detail, меню вообще не открывается. Теперь ведёт себя как SDK-fallback InlineOverflowMenu (containers.jsx).

## 1.8.0

### Minor Changes

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

## 1.7.0

### Minor Changes

- bab2fd2: DataGrid: поддержка `col.kind: "actions"` — per-row кнопки, вызывающие intents.

  **Problem:** DataGrid'ы с row-click'ом отлично работают, когда таблица ведёт в detail. Но **per-item actions** (Grant Role, Revoke Role, Download, Approve) требовали отдельной кнопки в каждой строке — не покрывалось API.

  **Shape extension:**

  ```js
  columns: [
    { key: "name", label: "Name", sortable: true, filterable: true },
    {
      key: "_actions",
      label: "Actions",
      kind: "actions",
      actions: [
        {
          intent: "grantRoleToUser",
          label: "Grant Role",
          params: {
            user: "item.name", // item.X резолвится из record
            metalake: "route.metalakeId", // route.X из ctx.routeParams
          },
        },
        {
          intent: "revokeRoleFromUser",
          label: "Revoke",
          params: { user: "item.name" },
          danger: true, // visual hint (red)
          disabled: (item, ctx) => !item.roles?.length, // optional predicate
        },
      ],
    },
  ];
  ```

  **Params resolution** (совпадает с onItemClick contract):

  - `"item.X"` → `record[X]`
  - `"route.Y"` → `ctx.routeParams[Y]`
  - остальное — literal

  **Implementation:** новый `ActionCell` в renderer DataGrid.jsx + `AntdActionCell` в
  adapter-antd. Click.stopPropagation предотвращает row-onClick fire одновременно.
  Action-column автоматически не sortable / не filterable (нет скалярного значения).

  **Tests:**

  - 402 renderer (6 новых для actions column: render, click → exec, stopPropagation, route-param resolve, disabled predicate, no-sort/filter на actions col)
  - 45 adapter-antd (сохранены)

  **Closes:** Gravitino G34 (per-item Grant Role action в user_list/group_list).

## 1.6.2

### Patch Changes

- 9e32c7a: DataGrid primitive теперь resolve'ит items из `ctx.world[node.source]` когда `node.items` пустой.

  **Problem:** DataGrid ожидал `node.items` напрямую; в catalog `projection.bodyOverride` (idf-sdk#214) `items: []` пустой (items — runtime-data). Без host-level resolve'а grid получал empty array → "Нет данных" на всех catalog-list проекциях.

  **Fix:** новый `resolveItems(node, ctx)` в обоих — renderer DataGrid.jsx и adapter-antd AntdDataGrid:

  - `node.items` (non-empty array) → используем
  - `node.items` пустой + `node.source` (string) → `ctx.world[source]`
  - fallback → `[]`

  **Shape extension:**

  ```js
  projection.bodyOverride = {
    type: "dataGrid",
    source: "catalogs",   // NEW — имя коллекции в ctx.world
    columns: [...],
    onItemClick: {...},
  };
  ```

  Source convention совпадает с catalog-архетипа default `buildCatalogBody` (`list.source = "<entityLowerCase>s"`).

  **Tests:** existing 16 renderer + 45 adapter-antd tests pass без изменений (backward compat: empty node.items + no source → [] as before).

  **Closes:** Gravitino G20/G21/G38 (catalog list DataGrid activation end-to-end).

## 1.6.1

### Patch Changes

- 152a8c3: Polish round для new Gravitino primitives — reusable jsdom setup, affinity declarations, richer DataGrid cell formatting.

  **Reusable vitest setup** (`src/test/setup.js`, подключается через `vitest.config.js setupFiles`):

  - `window.matchMedia` stub — AntD v6 responsive observer
  - `window.getComputedStyle` wrapper для pseudo-elements (AntD rc-table scrollbar-size)
  - `window.ResizeObserver` class-stub
  - Auto `cleanup()` afterEach — AntD Popover/Modal portals накапливаются в document.body без этого

  **Affinity declarations** (для renderer pickBest scoring):

  - `DataGrid.affinity`: types `[json, array]`, fields `[columns, tags, policies, items, rows]`, roles `[table-shape, column-schema]`
  - `Wizard.affinity`: roles `[wizard-flow]`
  - `PropertyPopover.affinity`: types `[json, map]`, fields `[properties, metadata, labels, attributes, tags]`
  - `ChipList.affinity`: types `[json, array]`, fields `[roles, tags, policies, labels, permissions]`

  **DataGrid cell formatting** (`renderCellValue`):

  - Boolean values → `<Tag color="green">✓</Tag>` / `<Tag>✗</Tag>` (dimmed)
  - `col.format = "date" | "datetime"` → monospace YYYY-MM-DD[ HH:mm]
  - `col.format = "number"` → `Intl.NumberFormat` с tabular-nums
  - `col.format = "currency"` (+ `col.currency`) → `Intl.NumberFormat({style:"currency"})`
  - `col.format = "code" | "mono"` → inline code-badge с subtle bg
  - `col.chipVariant = "policy" | "role"` → array cells с gold/purple Tag'ами
  - ISO date-string auto-detection (`/^\d{4}-\d{2}-\d{2}T/`) → datetime формат без explicit `format`
  - Объект → `<code title={full JSON}>first 40 chars…</code>` (tooltip для full content)

  **Tests:** +7 unit — DataGrid (boolean cell, currency format, ISO date detection, affinity check), PropertyPopover affinity, Wizard affinity, ChipList affinity. 45/45 pass.

## 1.6.0

### Minor Changes

- 4d15827: Native AntD delegations для 4 новых Gravitino-спринт primitives. Builder-level primitives (DataGrid, Wizard, PropertyPopover, ChipList) теперь рендерятся через соответствующие native AntD components вместо SVG-fallback.

  **Delegations:**

  - **DataGrid** → `<Table>` AntD с column sort (sorter), filter (filters + onFilter для enum), pagination (pageSize 20 при items >20), onRow click navigation
  - **Wizard** → `<Steps>` AntD + native fields (Input / InputNumber / Select / Input.TextArea) + Button'ы + inline testConnection
  - **PropertyPopover** → `<Popover>` AntD с scrollable content, trigger="click", placement="bottomLeft"
  - **ChipList** → `<Tag>` AntD с color prop (gold для policy, purple для role, default для tag), closable через onDetach

  **Capability registration:**

  ```js
  capabilities.primitive: {
    ...,
    dataGrid: { sort: true, filter: true, pagination: true },
    wizard: { steps: true, testConnection: true },
    propertyPopover: true,
    chipList: { variants: ["tag", "policy", "role"] },
  }
  ```

  **Use-case:** Gravitino dogfood Stage 8 — все primitive'ы в host domain (Table.columns / Metalake.properties / User.roles / Role.securableObjects / etc) получают native AntD look вместо built-in SVG-fallback.

  **Tests:** +12 unit: DataGrid (render + capability), Wizard (steps/empty/capability), PropertyPopover (empty/non-empty/capability), ChipList (render/overflow/empty/variants). 38/38 adapter-antd pass. Added jsdom stubs (matchMedia) для AntD v6 responsive observer.

## 1.5.0

### Minor Changes

- 799a8f2: Adapter-delegation для `Breadcrumbs` primitive — рендер через AntD native `<Breadcrumb />` компонент.

  Primitive-shape (renderer@0.29.0):

  ```js
  {
    type: "breadcrumbs",
    items: [{ label, projection, params?, current? }],
    separator?: "›",
  }
  ```

  AntD-делегация через `adapter.primitive.breadcrumbs = AntdBreadcrumbs` + capability flag `capabilities.primitive.breadcrumbs: true`. AntD `<Breadcrumb items>` принимает `{title, onClick, href}` — маппим: не-current → `onClick → ctx.navigate(projection, params)`, current → plain title (bold by AntD convention).

  **Explicit `current: true` mid-chain** — AntD не поддерживает нативно (полагается на last item = active). Имплементация: находим `currentIdx` (first explicit или last), пост-current item'ы рендерятся без navigation (subtle text).

  **Visual effect:** Gravitino breadcrumbs теперь выглядят native в AntD enterprise-fintech theme — separator, hover states, spacing совпадают с остальным UI-kit'ом.

  **Tests:** +4 unit (render items, empty null, click-navigate, capability registered). 26/26 pass.

## 1.4.0

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

## 1.3.0

### Minor Changes

- 1f457df: feat(shell.sidebar): все 4 адаптера получили собственный sidebar

  Host (idf#80) уже вызывает `getAdaptedComponent("shell", "sidebar")` с fallback на inline SectionedSidebar. Теперь каждый адаптер предоставляет свою визуально отличающуюся реализацию:

  - **Mantine** — corporate: Mantine `NavLink` с вложенными childrenOffset, ScrollArea, default-opened секции с chevron.
  - **shadcn (Doodle)** — handcrafted: dashed dividers между секциями, box-shadow на активном пункте, лёгкий `rotate(-0.5deg)` при active, spiralling doodle-icons (✎ / ○) для collapse-toggle.
  - **Apple (visionOS-glass)** — frosted: `backdropFilter: blur(40px) saturate(180%)`, translucent pills для active-state, uppercase section-label с letter-spacing, hover-background через events.
  - **AntD (enterprise-fintech)** — dense dark: antd `Menu` с `mode:"inline"`, `theme:"dark"`, type:"group" для секций, compact spacing.

  Контракт всех четырёх:

  ```js
  ({ sections: [{section, icon?, items}], active, onSelect, projectionNames })
  ```

  Все добавляют `capabilities.shell.sidebar: true` — host может делать `supportsVariant("shell", "sidebar")` для graceful fallback (уже работает через `getAdaptedComponent(...) || fallback`).

  После релиза прототип (idf) автоматически подхватит разные sidebar'ы при переключении UI-kit'а через PrefsPanel ⚙.

## 1.2.0

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

## 1.1.0

### Minor Changes

- 72d1033: Координированный minor-bump всего семейства `@intent-driven/*` для согласованного версионирования публичного npm-релиза.

## 1.0.0

### Patch Changes

- Updated dependencies [9f643b6]
  - @intent-driven/renderer@0.3.0

## 0.1.1 — 2026-04-15

### Changed

- Обновлена peerDependency `@intent-driven/renderer` до `>=0.2.0` (поддержка map primitive и IrreversibleBadge)

---

## 0.1.0 — 2026-04-14

- Первый релиз enterprise-fintech адаптера для `@intent-driven/renderer`
- AntD v6 + @ant-design/plots v2 + @ant-design/icons v6
- Компоненты: parameter (text/number/select/datetime), button (primary/secondary/danger/intent/overflow), primitive (heading/text/badge/avatar/paper/statistic/chart/sparkline), shell (modal/tabs)
- `AntdAdapterProvider` с `ConfigProvider` и авто-регистрацией адаптера
- Capability surface: `primitive.chart.chartTypes`, `primitive.statistic`, `primitive.sparkline`
- Четвёртый адаптер в линейке IDF (Mantine / shadcn / Apple visionOS-glass / AntD)
