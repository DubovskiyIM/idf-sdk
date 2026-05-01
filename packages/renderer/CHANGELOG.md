# Changelog

## 0.65.0

### Minor Changes

- cd0f153: DataGrid `chipList` cell kind: per-chip «×» detach button когда `col.intentOnDetach` задан.

  Click × → `ctx.exec(intentOnDetach, { id, entity, value: chipText })`. Foundation для gravitino Phase 3.10 (drop GroupDetailPane Members tab — chipList с associate + detach закрывает interactive add/remove use-case).

  Backward-compatible: без `intentOnDetach` chips остаются read-only.

## 0.64.0

### Minor Changes

- fccc174: DataGrid — interactivity для cell kinds `chipList` + `ownerAvatar`:

  - `chipList`: рендерит «+» add-button когда `col.intentOnAssociate` задан. Click → `ctx.openOverlay(overlay_<intent>)` если overlay найден, иначе `ctx.exec(intent, {id, entity})`.
  - `ownerAvatar`: avatar или placeholder становится clickable когда `col.editIntent` задан. Click → overlay/exec по той же схеме.

  Foundation для Phase 3.5 (gravitino MetalakesHub canvas → SDK-rendered catalog projection).

  Backward-compatible: без `intentOnAssociate`/`editIntent` cells остаются read-only как раньше.

## 0.63.0

### Minor Changes

- 0bf4e90: DataGrid: новые cell kinds `chipList` + `ownerAvatar` для inline-array и owner-string полей.

  - `chipList` — рендерит array-of-strings (item[col.key]) как inline ColoredChip's. Принимает col.chipKind ("tag" | "policy") для preset.
  - `ownerAvatar` — рендерит owner string через AvatarChip primitive. Принимает col.placeholder ("+ Set Owner").

  Также обновлён pattern `entity-tag-policy-columns` (`@intent-driven/core`): использует kind `chipList` вместо `chipAssociation` (последний — для junction-table assoc и не подходит к inline-arrays типа catalog.tags=[...]).

  Foundation для gravitino derived UI (catalog/schema/table/fileset/topic/model listings показывают tags/policies/owner inline без author bodyOverride).

  Backward-compatible — additive, существующие projections не затронуты.

## 0.62.0

### Minor Changes

- 27a2156: U-derive Phase 1 — extract 7 переиспользуемых primitives из gravitino host:

  - `<ColoredChip text color kind/>` — universal coloured chip (tag/policy/badge tones).
  - `<AvatarChip name kind size/>` — letter-avatar (user/group, sm/md/lg).
  - `<StatusBadge status label/>` — preset palette (success/failed/running/queued/cancelled/active/inactive). + `STATUS_PALETTE` export для extensions.
  - `<IllustratedEmptyState icon title description actionLabel onAction/>` — inline-SVG illustrations (catalogs/files/versions/jobs). NB: renamed из планируемого `EmptyState` чтобы не конфликтовать с существующим SDK `EmptyState` (другая API).
  - `<ConfirmDialog visible entityName entityKind onCancel onConfirm/>` — typed-name irreversibility confirmation (primitive). Parallel'ный `controls/ConfirmDialog` остаётся для declarative intent flow.
  - `<AssociatePopover title available selected onApply onClose/>` — multiselect popover с search.
  - `<TwoPaneShell sections active onSelect title>{children}</TwoPaneShell>` — 2-pane (left submenu + right body).

  Foundation для Phase 2 (pattern bank entries derived rendering) и Phase 3 (gravitino host refactor — drop ~30 host components, заменить на declarative projection metadata + SDK primitives).

  Backward-compatible — все additive, не меняет существующий API.

## 0.61.0

### Minor Changes

- 95ff577: `<Icon/>` primitive — централизованный icon-component с lucide-react default + emoji fallback. Канонические имена (schema/table/edit/delete/...). Host регистрирует custom resolver через `registerIconResolver(fn)`.

  Старый emoji-based `Icon` из `adapters/Icon.jsx` остался доступен как `IconLegacy` для backward compat. Lucide-react тянется через адаптеры (mantine/shadcn/apple/antd) — без peer на renderer-уровне (избегаем `@types/react` diamond). Если lucide-react не установлен — automatic fallback к emoji.

## 0.60.0

### Minor Changes

- 21977d0: DataGrid: resizable columns. Per-column `resizable: true` → drag-handle справа от th-cell; mouseDown/move/up меняют width в local state. Опционально `node.persistKey` → state persist в localStorage.

  Backward-compat: default `resizable: false` — UI не меняется без явного flag.

## 0.59.1

### Patch Changes

- 44ad6c8: DataGrid: nested dataPath ("audit.creator"), kind: "datetime" (toLocaleString), kind: "propertyPopover" (вместо JSON-snippet).

  Backward-compatible: flat dataPath / column.key как раньше; новые kinds — опциональны.

## 0.59.0

### Minor Changes

- c1e1135: feat(renderer): pixels reader gap policy observability в ProjectionRendererV2

  Reader integrations Step 2 — закрывает «contract orphan» от Phase 4/5 для pixels reader'а. Renderer теперь декларирует свою gap policy и сообщает наблюдённый canonical gap-set через callback, готовый к подаче в `detectReaderEquivalenceDrift`.

  **Новые опциональные props в `ProjectionRendererV2`:**

  | Prop             | Тип                     | Что                                                           |
  | ---------------- | ----------------------- | ------------------------------------------------------------- |
  | `ontology`       | `Ontology`              | Для computation gap-set'а; без неё gap detection пропускается |
  | `gapPolicy`      | `ReaderGapPolicy`       | Override; default = `getReaderPolicy("pixels")`               |
  | `onGapsObserved` | `(observation) => void` | Callback с `{ reader: "pixels", policy, gapCells }`           |

  **Поведение:**

  - Computation memoized по `(world, ontology)`.
  - Callback вызывается через `useEffect` (не side-effect во время рендера).
  - Без `ontology` — `gapCells = []` (не throw).
  - Без `onGapsObserved` — computation skipped, никакой работы.

  **Применение:**

  ```jsx
  <ProjectionRendererV2
    artifact={artifact}
    world={world}
    ontology={ontology}
    onGapsObserved={({ reader, policy, gapCells }) => {
      // Каждый раз при изменении world/ontology каллбек фaйрится.
      // Накопить observations от pixels + voice + document → подать в detectReaderEquivalenceDrift.
    }}
  />
  ```

  **peerDependency bump:** `@intent-driven/core: >=0.3.0` → `>=0.112.0` (требуется `computeCanonicalGapSet` из Phase 5 + `getReaderPolicy` из Phase 4).

  **Backward compat.** Pure extension — все 3 prop'а опциональны. Caller'ы, не использующие их, не замечают изменений.

  6 новых integration-тестов в `ProjectionRendererV2.gapPolicy.test.jsx`. Полный renderer suite **596/596** green.

## 0.58.0

### Minor Changes

- de27184: fix(renderer): §13e — `scopePicker` primitive + `body.type: "canvas"` dispatch в ArchetypeDetail

  Notion field-test (2026-04-27) обнажил два renderer gap'а после §13b/§13c:

  1. **«Unknown type: scopePicker»** — pattern `global-scope-picker.apply` push'ит `{ type: "scopePicker", ... }` в `slots.header` (PR #392), но primitive не зарегистрирован в renderer'е. SlotRenderer печатал error.

  2. **«Unknown type: canvas»** — `assignToSlotsDetail` нормализует author `slots.body: { kind: "canvas", canvasId }` → `{ type: "canvas", canvasId }` (PR #394), но `ArchetypeDetail` рендерит body через `<SlotRenderer>` который не знает canvas-type. SlotRenderer печатал error.

  ## Fix 1 — `scopePicker` primitive

  Новый `packages/renderer/src/primitives/ScopePicker.jsx` — minimal default-impl:

  - Читает `node.entity` / `node.label` из spec
  - Резолвит current scope row через `ctx.routeParams[<entity>Id]` или `ctx.viewState.active<Entity>Id`
  - Рендерит badge-style label `{label}: {scopeName | "—"}`
  - Адаптеры могут переопределить через `getAdaptedComponent("primitive", "scopePicker")` (когда понадобится drop-down с переключением)

  Зарегистрирован в `PRIMITIVES.scopePicker` + named export.

  ## Fix 2 — canvas body dispatch в ArchetypeDetail

  `ArchetypeDetail.jsx` теперь проверяет `slots.body?.type === "canvas"` и рендерит через `<ArchetypeCanvas>` (lookup в `CANVAS_REGISTRY` по `canvasId`). Иначе — обычный `<SlotRenderer>` (backwards-compat).

  ## Тесты

  renderer suite: **590/590 passing** (без regression).

  ## Что после релиза

  Notion `page_detail`:

  - `slots.header` рендерит `scopePicker` badge с workspace name
  - `slots.body` ({ type: "canvas", canvasId: "block_canvas" }) → `BlockCanvas` компонент с Tiptap-editor вместо «Unknown type: canvas»

  ## Backwards-compatibility

  - `body.type !== "canvas"` идёт через старый SlotRenderer path (no behavior change)
  - Адаптеры без `primitive.scopePicker` registration используют fallback ScopePicker (badge-style)
  - Existing canvas archetype проекций (notion `block_canvas`, `calendar_view`, etc.) не затронуты — это новый dispatch в **detail** archetype для author body passthrough

## 0.57.0

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

## 0.56.0

### Minor Changes

- ef8e738: revert(renderer): убрать AgentConsole из archetype list

  Архитектурный реверт PR #304 + #351. AgentConsole — НЕ archetype.

  **Почему не archetype:**

  Archetype в IDF format — это **структурный shape** проекции
  (catalog/detail/feed/form/canvas/dashboard/wizard). Это **declarative
  structure** над данными — composable across 4 reader'ов (pixels/voice/
  agent/document) с осмысленным mapping каждый.

  AgentConsole — это **interaction modality** (chat-стиль dialog с AI-
  агентом) поверх pixels reader + agent API. Это **поведение**, не
  структура. Не маппится на voice/document readers (там это уже сама
  modality, не shape).

  Конфлация двух осей:

  - shape (archetype) — что показывать
  - modality (reader) — как взаимодействовать

  **Где AgentConsole живёт правильно:**

  В **host-extension layer** — opt-in module package или domain-specific
  component. Не format core. Demo-modules не должны inflating archetype
  list (closed enum 7 archetypes остаётся стабильным; новые UX patterns
  живут в Pattern Bank или extensions).

  **Что revert'нуто:**

  1. Удалены `packages/renderer/src/archetypes/AgentConsole/` (4 файла +
     тест) — port в `idf-runtime/web/src/extensions/agent-console-demo/`.
  2. `packages/renderer/src/archetypes/index.js` — убран AgentConsole export.
  3. `packages/renderer/src/ProjectionRendererV2.jsx` — убран import и
     `agent_console: AgentConsole` запись из ARCHETYPES dict (PR #351).

  **Не revert'нуто (отдельным sprint'ом):**

  - crystallize_v2 — никогда не имел agent_console branch на main (PR #353
    был closed без merge).

  **Следующие шаги (за пределами этого PR):**

  - idf-runtime PR — extension layer `web/src/extensions/agent-console-demo/`
  - idf-studio PR — invest template `agent_console.archetype: "canvas"` +
    `extension: "agent-console-demo"` marker
  - Manifesto v2 — короткая глава «Extension surface vs format core» (TBD).

## 0.55.0

### Minor Changes

- 528f314: fix(renderer): зарегистрировать AgentConsole в `ARCHETYPES` registry

  `AgentConsole` archetype был добавлен в SDK 0.48.0 (PR #304) как
  8-й archetype для tool-use streams (ChatInput + SSE timeline для
  agent-демо). Файл `archetypes/AgentConsole/AgentConsole.jsx` существует,
  экспорт через `archetypes/index.js` есть, но **dispatch dict
  `ARCHETYPES` в `ProjectionRendererV2.jsx` его не содержит**.

  Симптом: при `archetype: "agent_console"` рендерер делает lookup
  `ARCHETYPES["agent_console"]` → undefined → fallback "Архетип не
  поддержан" (или crystallize синтезирует catalog по mainEntity и
  рендерит catalog вместо AgentConsole UI).

  Fix: добавлен import + entry в registry. 1 строка.

## 0.54.0

### Minor Changes

- 40b5213: feat(patterns): dual-status-badge-card — карточка catalog'а с двумя orthogonal status-badge'ами

  Promote'ится из argocd-pattern-batch (2026-04-24, ArgoCD/Flux/Spinnaker/Rancher batch). Status-driven admin (GitOps, K8s, CI/CD) выводит ≥2 независимых status-axes на одну карточку — ArgoCD Application имеет sync (Synced/OutOfSync/Unknown) + health (Healthy/Progressing/Degraded/...). Один derived badge скрывает orthogonality и diagnostic info.

  **Trigger**: catalog + mainEntity содержит ≥2 enum-полей-status (fieldRole === "status" ИЛИ name endsWith "Status"/"State"/"Phase") в witnesses проекции.

  **Apply order**: после grid-card-layout (badges релевантны только в card-визуале). Расширяет cardSpec через `badges: [{bind, label, values}, ...]`. Backfill'ит legacy `cardSpec.badge` ← `badges[0]`. No-op если author уже задал badges или body.layout != grid.

  **Renderer**: GridCard читает `cardSpec.badges` array, рендерит chip-style atoms; fallback на single `cardSpec.badge` для backward-compat.

## 0.53.0

### Minor Changes

- 128c9c6: feat(renderer): renderAs dispatchers resourceTree + conditionsTimeline

  Закрывает §10.4c (ArgoCD G-A-4c). Парный с §10.4a (importer extractInlineArrays, idf-sdk#306) и §10.4b (SubCollectionSection inlineSource, idf-sdk#315). Pipeline для inline-children теперь полный:

  ```
  importer.extractInlineArrays → entity.inlineCollections[]
    → crystallize_v2 (next PR) → section.inlineSource
      → SubCollectionSection inlineSource (#315)
        → renderAs.type === "resourceTree" | "conditionsTimeline" (this PR)
  ```

  ## Новый primitive `ResourceTree`

  Древовидный inline-list для Kubernetes-style ресурсов (Deployment → ReplicaSet → Pod, Service, ConfigMap, ...). Резолвит depth через:

  - `levelField` (если задан, приоритет) — явный уровень в item
  - `parentField` — строит граф через `item[parentField] === parent[nameField]`
  - иначе flat (level 0)

  **Props:**

  - `items`, `nameField` (default `"name"`), `kindField` (default `"kind"`)
  - `iconMap` — extends `DEFAULT_KIND_ICONS` (Deployment 📦, Pod 🐳, Service 🔌, etc.)
  - `badgeColumns: [{ field, colorMap }]` — Tag cells справа от имени
  - `onItemClick(item)` — row-click callback

  Зарегистрирован в `PRIMITIVES.resourceTree` + named export `ResourceTree`. EventTimeline тоже теперь named-экспорт из `primitives/index.js`.

  ## EventTimeline `dotColorBy` (snapshot kind)

  Расширение для severity-coloring conditions timeline:

  ```js
  dotColorBy: {
    field: "type",
    colorMap: { SyncError: "danger", ResourceHealth: "success" },
    default: "default",
  }
  ```

  Маппит value через colorMap → tone → hex (`success #22c55e` / `warning #f59e0b` / `danger #ef4444` / `info #3b82f6` / `neutral #9ca3af` / `default #6366f1`). Также ранее snapshot/causal rows крэшились на items без `id` — теперь синтетический React-key (`snap_${idx}` / `causal_${idx}`).

  ## SubCollectionSection — два новых dispatcher'а

  ```js
  // K8s status.resources[]
  {
    inlineSource: "status.resources",
    renderAs: {
      type: "resourceTree",
      nameField: "name", kindField: "kind",
      parentField: "ownerName",
      badgeColumns: [
        { field: "health", colorMap: { Healthy: "success", Degraded: "danger" } },
        { field: "sync",   colorMap: { Synced:  "success", OutOfSync: "warning" } },
      ],
      intentOnClick: "open_resource",  // ctx.exec(intent, { id: item.id })
    },
  }

  // K8s status.conditions[] — audit-log timeline
  {
    inlineSource: "status.conditions",
    renderAs: {
      type: "conditionsTimeline",
      atField: "lastTransitionTime",      // default
      stateFields: ["type", "status", "message"],  // default
      dotColorBy: {
        field: "type",
        colorMap: { SyncError: "danger", ResourceHealth: "success" },
      },
    },
  }
  ```

  ## Closes

  - backlog §10.4c (ArgoCD G-A-4c, 16-й полевой тест)
  - Полностью закрывает inline-children family вместе с §10.4a (#306) + §10.4b (#315)

  ## Тесты

  - 11 новых для `ResourceTree` (flat / kind-icon / iconMap override / parentField graph / levelField priority / badge columns / onItemClick / orphan-cycle / empty / id-less smoke)
  - 7 новых для SubCollectionSection dispatchers (inline+resourceTree integration, intentOnClick, empty, conditionsTimeline render, dotColorBy, custom at/stateFields, empty)
  - 587/587 green в renderer (+18 от 569)

## 0.52.0

### Minor Changes

- c743c79: feat(renderer): SubCollectionSection inlineSource — child-collection из parent[path] без FK-lookup

  K8s CRD и audit-log API часто содержат inline массивы объектов, лежащие внутри parent JSON, а не отдельной коллекцией в `world` (например, `Application.status.resources[]`, `Application.status.conditions[]`). До PR такие массивы рендерились через синтетическую entity + синтетический FK на parent (host workaround в ArgoCD).

  Новая опция `section.inlineSource: "status.resources" | ["status", "resources"]` указывает SubCollectionSection резолвить items напрямую из `target[path]`, минуя `ctx.world` и `foreignKey`. Все остальные фичи секции работают идентично:

  - `where`, `sort`, `terminalStatus`, `hideTerminal`
  - `groupBy` / `groupNullLabel`
  - `renderAs.type` (permissionMatrix / credentialEditor / eventTimeline)
  - `addControl`, `itemIntents`, `editableFields`

  **Совместимость**: новое поле, default-off. Существующие секции (foreignKey + source-via-world) работают без изменений (no-regression покрыт тестами).

  **Безопасные defaults**:

  - target=null или missing path → items=0, секция не рендерится (как пустая секция).
  - Inline items без `id` получают синтетический React-key (`inline_${idx}` / `${groupKey}_${idx}`).
  - Если оба `inlineSource` и `foreignKey` заданы — inlineSource побеждает (foreignKey игнорируется).

  **Closes:** backlog §10.4b (ArgoCD G-A-4b). Парный с importer §10.4a (PR #306) — кристаллизатор может транслировать `entity.inlineCollections[]` в `section.inlineSource` автоматически (отдельный PR в core).

  **Тесты:** 9 новых (dot-string, array form, FK-ignore, sort, where, groupBy, missing-path, target=null, missing-id). 569/569 green в renderer.

## 0.51.0

### Minor Changes

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

## 0.50.0

### Minor Changes

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

## 0.49.0

### Minor Changes

- 849c175: feat(renderer): `CoSelectionProvider` + `useCoSelection` — shared selection state

  Новый cross-cutting primitive для cross-projection co-selection паттернов
  (`bidirectional-canvas-tree-selection` и др.). Второй из трёх promotion-gate'ов
  для candidate-паттерна.

  API:

  ```jsx
  <CoSelectionProvider initial={{ entityType, ids }} onChange={handler}>
    <TreePeer /> {/* пишет selection клику по group */}
    <CanvasPeer /> {/* читает → highlight + zoomTo */}
  </CoSelectionProvider>
  ```

  Hooks:

  - `useCoSelection() → { selection, setSelection, toggleSelection, clearSelection, isSelected }`
  - `useCoSelectionActive()` — определяет, смонтирован ли провайдер (для adapter'ов
    с `supportsExternalSelection` capability)

  Shape `selection`: `null | { entityType: string, ids: string[] }`. Нормализация:
  numeric id → string, дубликаты убираются, пустой ids → null, смена entityType
  в `toggleSelection` — reset + single.

  **Graceful fallback:** вне провайдера `useCoSelection()` возвращает no-op версию
  (`isActive === false`) — peer-компоненты безопасно вызывают hook без обязательного
  оборачивания.

  26 новых тестов в `coSelection.test.jsx`: basic state, normalization
  (дубликаты/numeric/null/invalid), toggleSelection (add/remove/reset-on-entityType-change),
  isSelected, onChange side-effect, graceful no-op вне провайдера, two-peer синхронизация.

  551/551 renderer tests зелёные.

## 0.48.0

### Minor Changes

- 7e3f8a4: Добавлен archetype `AgentConsole` + `useSSE` hook для LLM-агентов через tool-use loop в runtime. TimelineItem поддерживает 6 variants (thinking/effect/observation/pause/error/done) с русскоязычными REASON_LABELS для rejected-preapproval кейсов. Используется в invest-tenant'е Fold SaaS.

## 0.47.0

### Minor Changes

- 73ff542: feat(datagrid): `column.kind === "badge"` — cell-renderer с colorMap

  Новый cell-renderer для status-колонок в status-driven admin UIs (ArgoCD,
  Gravitino, Keycloak). Делегирует в существующий `Badge` primitive с tone
  mapping:

  ```js
  { key: "syncStatus", kind: "badge", colorMap: {
      Synced: "success", OutOfSync: "warning", Unknown: "neutral"
  }}
  ```

  `colorMap` — alias `toneMap` семантического vocabulary Badge primitive
  (success/warning/danger/info/neutral/default). Адаптер (AntD Tag /
  Mantine Badge) маппит tone в свой color-набор; SVG-fallback — inline-span
  с readable bg/fg. `null`/`""` → em-dash.

  Backward-compat: `column.format === "badge"` остаётся (простой inline-span
  без tone). Новый `kind: "badge"` — более rich.

## 0.46.0

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

## 0.45.0

### Minor Changes

- c6508f1: G-K-12 renderer follow-up: FormModal dispatch на Wizard primitive
  (или TabbedForm) когда `spec.bodyOverride` задан.

  Без этого core PR idf-sdk#275 (passthrough authored
  `<entity>_edit.bodyOverride` в overlay.bodyOverride) не имел render
  effect — modal продолжал рендерить flat parameters list.

  Поведение:

  - `bodyOverride.type === "wizard"` — render Wizard primitive со steps
    - breadcrumb + step-navigation + onSubmit
  - `bodyOverride.type === "tabbedForm"` — minimal inline TabbedForm
    с tabs + per-tab field render + aggregated submit
  - Unknown type — fallback на flat parameters (backward-compat)

  После этого Stage 5 wizards в Keycloak (realm/client/IdP create-flows
  авторированные через `bodyOverride: { type: "wizard", steps: [...] }`)
  работают и для EDIT через row-action ✎ Изменить.

  4 unit-tests + renderer suite 499/499 green.

## 0.44.0

### Minor Changes

- 57479d1: `SubCollectionSection` поддерживает `renderAs: { type: "permissionMatrix" | "credentialEditor" }` — завершает Stage 8/9 (P-K-C / P-K-D) Keycloak.

  Existing convention `section.renderAs` (сейчас `"eventTimeline"`) расширена двумя новыми dispatcher'ами:

  **`permissionMatrix`** (P-K-D — role-mappings matrix):

  ```js
  {
    title: "Role mappings",
    source: "roleMappings",
    foreignKey: "userId",
    renderAs: {
      type: "permissionMatrix",
      privileges: ["manage", "view", "invoke"], // optional explicit columns
      readOnly: true,                            // default
    },
  }
  ```

  Filtered items (по foreignKey) → `PermissionMatrix.value`. Inheritance badges (idf-sdk#269) видны автоматически из `item.inheritedFrom`.

  **`credentialEditor`** (P-K-C — multi-kind credentials):

  ```js
  {
    title: "Credentials",
    source: "credentials",
    foreignKey: "userId",
    renderAs: {
      type: "credentialEditor",
      readOnly: false,
      actionIntents: { rotate: "resetUserPassword", delete: "removeCredential" },
      actionsByType: { /* override per-type actions */ },
    },
  }
  ```

  Actions → `ctx.exec(actionIntents[action], { credentialId, id })`. Discriminator-driven primitive (idf-sdk#272) с 4 типами.

  Без `renderAs` — поведение не меняется (default `SubCollectionSection` list rendering). `renderAs.type === "eventTimeline"` — существующий path.

  Unblocks Keycloak Stage 8/9 полноценный UI: user_detail projection с `{ entity: "RoleMapping", renderAs: { type: "permissionMatrix" } }` + `{ entity: "Credential", renderAs: { type: "credentialEditor" } }` автоматически рендерится через primitive'ы с type-specific views.

  ## Tests

  `SubCollectionSection.behavior.test.jsx` +5 новых:

  - permissionMatrix рендер + Alice filter / пустой no-op
  - credentialEditor рендер + foreignKey filter / action exec / readOnly default

  `@intent-driven/renderer`: **500 passed** (было 495, +5).

## 0.43.0

### Minor Changes

- 5546388: `CredentialEditor` primitive — multi-kind credential viewer (P-K-C Keycloak Stage 8).

  Discriminator-driven primitive для User.credentials entity с 4 типами: `password` / `otp` / `webauthn` / `x509` + fallback для unknown. Sidebar со списком credentials + detail-area с type-specific sub-view.

  ## Shape

  ```js
  value: [
    { id, type: "password", userLabel, createdDate, algorithm, hashIterations, temporary },
    { id, type: "otp",      userLabel, createdDate, algorithm, digits, period, counter?, device? },
    { id, type: "webauthn", userLabel, createdDate, device, credentialData },
    { id, type: "x509",     userLabel, createdDate, device, credentialData },
  ]
  ```

  ## Sub-views

  - **password** — hashed storage meta (algorithm / iterations / temporary), notice про невозможность plain-password; action `rotate` по умолчанию
  - **otp** — TOTP (period) vs HOTP (counter), algorithm / digits / period / device; action `revealSecret` одноразовый
  - **webauthn** — device name + truncated credential-id
  - **x509** — subject + truncated DER
  - **unknown** — fallback key-value таблица

  ## Actions

  Default map `actionsByType`:

  - `password` → `[rotate, delete]`
  - `otp` → `[revealSecret, delete]`
  - `webauthn` → `[delete]`
  - `x509` → `[delete]`

  Host передаёт `onAction(action, credential)` — обрабатывает через `ctx.exec`. `readOnly: true` (default) — actions не рендерятся.

  ## Tests

  `CredentialEditor.test.jsx` — 17 новых: basic rendering / empty state / per-type sub-views (password/otp/TOTP vs HOTP/webauthn/x509/unknown) / selection (internal + controlled) / actions read-only и interactive + custom actionsByType override.

  `@intent-driven/renderer`: **492 passed** (было 475, +17).

  ## Use-case

  Keycloak User.credentials — показывает все credentials пользователя + per-type actions. Аналогично AWS IAM access-keys, SSH-keys management, API-keys rotation UI.

- a5b71a0: Fix G-K-23: ProjectionRendererV2 validation теперь soft-warn по умолчанию
  (console.warn + render продолжается) вместо hard-fail с red box.

  Раньше `validation.errors !== []` всегда блокировал render. Это создавало
  visual regressions при любой mismatch (например, неизвестный control type,
  duplicate overlay key, unknown primitive) — даже когда artifact мог быть
  рендерен корректно.

  Новое поведение:

  - **Default**: validation errors → console.warn (с подробной диагностикой)
    - render продолжается. Renderer пытается рендерить archetype, ошибки
      попадают в DevTools, не в UI.
  - **Strict mode** (`validationStrict={true}` prop): hard-fail с red box —
    старое поведение. Используется в Studio authoring environment / CI
    где любая invalidity критична.

  Discovered в Keycloak dogfood-спринте 2026-04-23 — formModal с
  `control:"checkbox"` (теперь fixed в #259) делал UI неиспользуемым на
  все 200+ overlay keys, хотя сам artifact рендерился бы корректно.

## 0.42.0

### Minor Changes

- 5bc3eb2: `PermissionMatrix` рендерит inheritance-badges для row.inheritedFrom (P-K-D Keycloak Stage 9).

  Keycloak role-mappings имеют 4 источника: direct / composite / group / client-default. Пользователь должен видеть не только наличие роли, но и причину (почему она attached).

  Новое optional поле `value[].inheritedFrom`:

  ```js
  value: [
    { type: "realm", name: "admin", privileges: ["manage"] }, // direct
    {
      type: "realm",
      name: "view",
      privileges: ["view"],
      inheritedFrom: "composite:admin",
    },
    {
      type: "client",
      name: "use",
      privileges: ["use"],
      inheritedFrom: { kind: "group", via: "developers" },
    },
    {
      type: "realm",
      name: "x",
      privileges: ["x"],
      inheritedFrom: { kind: "client", via: "account" },
    },
  ];
  ```

  Shape — string `"kind:via"` или object `{ kind, via }`. Kind tone-map:

  - `composite` — violet «через composite: …»
  - `group` — blue «через группу: …»
  - `client` — green «client-default: …»
  - `inherited` / fallback — grey

  Badge рендерится рядом с row.name в resource-cell. Unknown kind — использует kind как label. Без `inheritedFrom` — поведение не меняется (back-compat).

  ## Use-case Keycloak Stage 9

  `user_detail` projection может теперь показать полный role-mappings матрикс:

  - Realm roles + Client roles (direct/composite/group-inherited)
  - Badge подсвечивает источник — user admin видит "почему у него эта роль" и что нельзя remove без отвязки от группы

## 0.41.0

### Minor Changes

- a55da91: Two related DataGrid fixes из Keycloak dogfood-спринта 2026-04-23
  (G-K-24 + G-K-25):

  **G-K-25: DataGrid::resolveItems применяет node.filter**

  Раньше resolveItems возвращал `ctx.world[source]` напрямую — игнорировал
  `node.filter`. Filter работал только для `body.type:"list"` (через
  `applyFilter` в containers.jsx). Authored projection с
  `bodyOverride: { type: "dataGrid", filter: "..." }` не отфильтровывал.

  Fix: resolveItems применяет filter (string → evalCondition с row keys

  - viewer/world/viewState; object → evalFilter из core).

  **G-K-24: ActionCell auto-open overlay для form-confirmation intents**

  Раньше per-row actions делали `ctx.exec(intent, params)` напрямую.
  Для intents с `confirmation:"form"` это инвокило effect без UI —
  modal не открывался. Update/edit row-actions ломались (button
  рендерился, click пустой effect).

  Fix: `triggerAction` helper с приоритетом resolution:

  1. `action.opens === "overlay"` — explicit override (highest)
  2. `ctx.intents[intent].confirmation === "form"` + `ctx.openOverlay`
     → auto-open overlay с key `overlay_${intent}` (default convention)
  3. fallback — `ctx.exec` (backward-compat для click-confirmation intents)

  Discovered в Keycloak dogfood. Без этих fix'ов admin-style flow
  (Click ✎ Изменить → modal с entity.fields, click × Удалить →
  ConfirmDialog) не работает.

  9 unit-tests + renderer suite 470/470 green.

## 0.40.1

### Patch Changes

- 35c1681: `ProjectionRendererV2` принимает prop `testConnection` и прокидывает в `ctx.testConnection` (P-K-B Keycloak Stage 7).

  Wizard primitive уже имеет `step.testConnection` async handler с 2026-04-22, но до этого PR `ProjectionRendererV2` не пробрасывал host-side implementation в ctx — Wizard показывал «ctx.testConnection не реализован».

  Теперь host передаёт handler как prop:

  ```js
  <ProjectionRendererV2
    artifact={...}
    exec={wrappedExec}
    testConnection={async (intentId, values) => {
      const res = await fetch(`/api/test/${intentId}`, { method: "POST", body: JSON.stringify(values) });
      const data = await res.json();
      return { ok: res.ok, message: data.message };
    }}
    viewerContext={...}
    routeParams={...}
  />
  ```

  Обёртка подмешивает `viewerContext` + `routeParams` в `values` по той же конвенции, что `wrappedExec` — чтобы server-probe знал текущего пользователя и realm/tenant scope.

  Use-case: Keycloak IdP create wizard — middle-step `Endpoints` с `testConnection: { intent: "testIdentityProviderConnection" }` валидирует OAuth discovery URL / SAML metadata до submit.

## 0.40.0

### Minor Changes

- f3770cf: `TabbedForm` primitive для enterprise-config UI (P-K-A Keycloak Stage 6).

  Form-архетип теперь поддерживает `bodyOverride.type === "tabbedForm"` — декомпозиция одной большой формы на семантические tabs с per-tab save. UX отличается от Wizard: tabs — free-form navigation, каждый tab имеет свой `onSubmit.intent` (или shared), values persist между переключениями.

  Typical use:

  - Keycloak Client settings (10 tabs × 30+ полей)
  - Keycloak Realm general config
  - AWS IAM role config
  - K8s Deployment YAML as semantic tabs

  ## Shape

  ```js
  projection.bodyOverride = {
    type: "tabbedForm",
    tabs: [
      {
        id: "settings",
        title: "Settings",
        fields: [...],
        onSubmit: { intent: "updateClient", label: "Сохранить" },
      },
      { id: "flow", title: "Client type", fields: [...], onSubmit: { intent: "updateClient" } },
    ],
    initialTab: "settings",  // optional, default — первая
    value: { ... }           // optional initial form-state, target-entity fields fill прочее
  };
  ```

  ## Поведение

  - Dirty-tracking per-tab — Save disabled пока tab не edited
  - Values persist между переключениями (пользователь может free-form navigate)
  - Save вызывает `ctx.exec(activeTab.onSubmit.intent, { ...activeValues, id: target.id })`
  - Tab без `onSubmit.intent` — view-only (save не показывается)
  - Пустые `fields` — placeholder message
  - Target-overlay initial values: `target[field.name]` → `values[field.name]` если не override'нуто `node.value`

  ## Integration

  `ArchetypeForm` проверяет `body.type === "tabbedForm"` и делегирует в `TabbedForm` primitive. Без `bodyOverride` — back-compat flat formBody.

  ## Тесты

  `TabbedForm.test.jsx` — 11 новых:

  - Рендер tabs + начальная активная
  - Tab switching показывает fields другого tab'а
  - Required-маркер
  - initialTab option
  - Пустой tabs / пустые fields / без onSubmit
  - Dirty tracking + exec payload
  - Save clears dirty per tab
  - Values persist между tab-switch
  - Target-overlay начальных значений (+ node.value приоритет)

  `@intent-driven/renderer`: **460 passed** (было 449, +11).

  ## Follow-up

  - Pattern `tabbed-form-sections` в core — автоматическое apply по name-pattern (`Client.detail` с >30 полей → discover `settings` / `flow` / `urls` tabs). Сейчас только authored-путь
  - `core` — сохранение `bodyOverride` для `archetype: "detail"` тоже (сейчас только catalog / form)

## 0.39.0

### Minor Changes

- 3825165: `AdminShell` — новый layout-primitive для admin-style enterprise UX
  (Keycloak / Gravitino / Argo / Grafana / любой control-plane).
  2-column shell с persistent sidebar tree (instance-aware) и body,
  переключаемым через `onSelect`. Контраст с `TreeNav`: тот рендерит
  schema-иерархию (entity-types) внутри catalog body; `AdminShell` — это
  layout-region, дерево с runtime-instance-узлами + params.

  API:

  ```jsx
  <AdminShell
    tree={[
      {
        id: "realm:r_master",
        label: "master",
        projectionId: "realm_detail",
        params: { realmId: "r_master" },
        children: [
          { id: "users:r_master", label: "Users", projectionId: "user_list", params: { realmId: "r_master" } },
          ...
        ],
      },
    ]}
    body={<ProjectionRendererV2 projection={current} />}
    onSelect={({ projectionId, params, node }) => navigate(projectionId, params)}
    currentNodeId="users:r_master"
    expanded={["realm:r_master"]}     // controlled, или uncontrolled (опускаем)
    onExpand={(nodeId, isExpanded) => ...}
    sidebarWidth={260}
    sidebarTitle="Workspace"
  />
  ```

  Discovered в Keycloak dogfood-спринте 2026-04-23 (G-K-14): hierarchy-tree-nav
  pattern apply'ится только внутри одного catalog body, нет глобального
  persistent sidebar. AdminShell закрывает целый класс админ-UI use-case'ов.

  10 unit-tests covering layout (aside+main), expansion (controlled +
  uncontrolled), instance-aware onSelect, currentNodeId active highlighting,
  empty / null edge cases.

## 0.38.1

### Patch Changes

- 9c0f578: Adapter-specific нативные chips для `ChipList` primitive.

  `ChipList` теперь делегирует не только через `ctx.adapter.getComponent` (для unit-тестов), но и через глобальный `getAdaptedComponent` из `renderer/adapters/registry.js` — т.е. автоматически резолвится в runtime после `registerUIAdapter(mantineAdapter)` / etc. Back-compat: если адаптер не реализует `chipList`, fallback на built-in span'ы.

  Добавлены native-компоненты:

  - **adapter-mantine** — `MantineChipList` использует Mantine `Badge` с `ActionIcon` для `×`, color-map по variant (gray/orange/violet)
  - **adapter-shadcn** — `ShadcnChipList` в doodle-стилистике: hand-drawn границы, font-doodle, custom `×` кнопка
  - **adapter-apple** — `AppleChipList` glass-morphism: pill-shape, semi-transparent fill по variant (gray/orange/purple), subtle backdrop-blur border

  `@intent-driven/adapter-antd` уже имел `AntdChipList` (native `Tag` с `closable`) — не менялся, но теперь вызывается через общий путь.

  Capability declaration (`primitive.chipList: { variants: ["tag", "policy", "role"] }`) добавлена во все 4 адаптера.

  Follow-up: attach-picker modal теперь полностью закрыт (через #235), так что сессия по Gravitino-паттернам завершена — `inline-chip-association` / `lifecycle-gated-destructive` / `reverse-association-browser` работают end-to-end во всех 4 visual языках.

## 0.38.0

### Minor Changes

- 801c558: `RowAssociationChips` теперь overlay-aware для attach-picker flow.

  При клике на «+» в chip-блоке проверяется `ctx.artifact.slots.overlay` на наличие `overlay_<attachIntentId>`. Если кристаллизатор создал overlay (CAPTURE_RULES matches `entityPicker` — т.е. intent.creates=Junction + non-creates entity вне route scope), открывается picker через `ctx.openOverlay`. Пользователь выбирает other-entity, `EntityPicker` сам exec'ит intent с полным payload.

  Если overlay для intent'а не создан — fallback на прямой `ctx.exec(attachIntent, {foreignKey: item.id})` (back-compat с существующими поведением). Поведение `detach` (×) — без изменений, всегда direct exec.

  Практика: для m2m junction'а с `attachIntent.particles.entities: [parent, other]` runtime автоматически поднимет picker — пользователь выбирает `other` из существующей коллекции, вместо того чтобы создавать новый через form modal.

## 0.37.0

### Minor Changes

- c3b3621: Рендер-интеграция 3 Gravitino-паттернов (PR #230):

  - `ArchetypeDetail` прокидывает `slots.actionGates` в ctx; `IntentButton` читает gate'ы по `spec.intentId`, eval'ит `blockedWhen` против target → disabled + tooltip. Click по disabled — no-op.
  - `ArchetypeCatalog` прокидывает `slots.rowAssociations` в ctx; `DataGrid` автоматически инжектит chip-column per association (перед actions), `ChipCell` резолвит junction-records + других entity + рендер через `ChipList` с attach/detach.
  - `SubCollectionSection` получает fallback для `source: "derived:<id>"` — collection-key берётся из `section.collection` или pluralized `section.itemEntity`. Pattern `reverse-association-browser` теперь корректно отображает referrer-items на reference-entity detail.

  Core (patch): у `reverse-association-browser` section дополнительно выставляется `itemEntity` и `collection` (pluralized, с учётом `entity.collection` override'а).

- c3b3621: Рендер chip-ассоциаций (`inline-chip-association` pattern) в list/grid/kanban layouts (PR #231):

  - Новый primitive `RowAssociationChips` — shared между DataGrid cell-renderer'ом и containers. Layouts `inline` (для таблицы) и `stacked` (label + chips под ним для card/list).
  - `containers.jsx` оборачивает каждый item (list / grid-card / kanban card) в `RowAssociationsGroup` — блок со stacked chips per `ctx.rowAssociations`. Пусто без ассоциаций — ничего не рендерится.
  - `DataGrid.ChipCell` теперь делегирует в `RowAssociationChips`; header-label берётся через `pluralizeAsLabel`.

  `+` кнопка дергает attachIntent, «×» на chip — detachIntent (attach-picker modal — follow-up).

- c3b3621: `SubCollectionSection` поддерживает `section.groupBy` для polymorphic junctions (PR #232).

  Если задано, items группируются по значению field, рендерятся bucket'ами: subheader «Label (count)» + items внутри. Null/пустые значения — отдельный bucket с `groupNullLabel` (дефолт «Без значения»). Порядок групп — стабильный по первому встреченному значению после `applySort`.

  Pattern `reverse-association-browser` уже выставляет `groupBy` на discriminator-поле polymorphic junction (`objectType` / `entityType` / `kind`) — теперь Gravitino Tag.detail рендерится сгруппированным: Catalog (3) / Schema (12) / Table (45), а не flat-списком. Без `groupBy` поведение не меняется (back-compat).

## 0.36.0

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

## 0.35.0

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

## 0.34.1

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

## 0.34.0

### Minor Changes

- cc0fb6a: Два новых primitives — `PropertyPopover` и `ChipList` для property-dicts и association-коллекций.

  ## PropertyPopover

  Compact inline summary + click-reveal detail panel для key-value `properties: {}` полей. Classical pattern для AWS tags, K8s annotations, Gravitino metalake/catalog/schema properties.

  **Shape:**

  ```js
  <PropertyPopover value={{ env: "prod", region: "us-east-1", ... }} maxInline={3} />
  ```

  **Фичи:**

  - Inline chips (первые N entries) + `+M` overflow trigger
  - Counter label ("5 properties") как aria-description
  - Click trigger → popover overlay со ВСЕМИ entries (scrollable, max-height 320)
  - Close on: second click / Escape / outside click
  - `aria-expanded`, `aria-haspopup`, `role="dialog"` a11y
  - Value formatting: boolean → "true"/"false", null → "—", object → stringified (60ch trunc)

  ## ChipList

  Array-values как chip-коллекция с variant-стилизацией и detach/click interactions.

  **Shape:**

  ```js
  <ChipList
    value={["PII", "Financial"]}
    variant="tag"              // "tag" | "policy" | "role"
    maxVisible={5}
    onDetach={(item, i) => ...} // optional — показывает × на chip
    onItemClick={(item) => ...}  // optional — клик по chip
  />
  ```

  **Фичи:**

  - String items → простой chip с текстом; object items `{name, color?, icon?}` → styled chip
  - Three variants: `tag` (neutral gray), `policy` (amber), `role` (purple)
  - Overflow: `maxVisible` + `+N` badge
  - Detach × button (stopPropagation чтобы не вызвать onItemClick)
  - Keyboard-accessible (Enter/Space на clickable chip)
  - Adapter delegation для native AntD Tag / Chip

  ## Use-cases

  Gravitino (docs/gravitino-gaps.md):

  - **G37 PropertyPopover** — `Metalake.properties`, `Catalog.properties`, `Schema.properties`, `Table.properties` → активация через `field.primitive: "propertyPopover"`
  - **G22 ChipList** — `Catalog.tags`, `Catalog.policies`, `User.roles`, `Group.roles` → `field.primitive: "chipList"` + variant

  **Tests:** +16 PropertyPopover + +13 ChipList = 29 new, 396/396 renderer pass.

  **Closes:** G22 (chip-associations), G37 (PropertyPopover primitive).

## 0.33.0

### Minor Changes

- 90de20a: Новый primitive `Wizard` — multi-step form с provider/discriminator-dependent шагами и async `test-connection` action.

  **Shape:**

  ```js
  {
    type: "wizard",
    steps: [
      { id: "type", title: "Type", fields: [...] },
      { id: "provider", title: "Provider", fields: [...], dependsOn: { type: "relational" } },
      { id: "config", title: "Config", fields: [...], testConnection: { intent: "testConnection", label?: "Test Connection" } },
    ],
    value: {},
    onSubmit: (values) => ...,
  }
  ```

  **Фичи v1:**

  - **Progress bar** с номерами шагов + labels сверху. Completed/current/upcoming — разные стили.
  - **Step navigation**: Next / Back / Submit buttons. Back disabled на первом; Submit на последнем.
  - **dependsOn conditions**: `dependsOn: { type: "relational" }` — шаг появляется только когда ВСЕ conditions match current values. Иначе пропускается (не в progress + не доступен navigation'ом).
  - **Fields rendering**: text / textarea / number / boolean / select с options. Required marker `*`. Hint text под полем.
  - **test-connection control** (optional per-step): button с async validation → ctx.testConnection(intent, values): Promise<{ok, message}>. Inline states: idle / loading / ok / error.
  - **Label accessibility**: `<label htmlFor>` + input `id` (prefix `wz-field-`) — form-control а11y.
  - **Adapter delegation**: `ctx.adapter.getComponent("primitive", "wizard")`.

  **Use-case:** Gravitino Catalog creation wizard (G23/G24 P0):

  1. Step "Type" — catalog type (relational / messaging / fileset / model)
  2. Step "Provider" — provider (hive / iceberg / hudi / kafka / ...) — dependsOn type
  3. Step "Configuration" — URI + credentials + `testConnection: { intent: "testCatalogConnection" }`
  4. Step "Properties" — key-value pairs

  **Tests:** +16 unit (progress/first/last/empty/back disabled, navigation next+back+submit, dependsOn skip+include, testConnection render/call/success/error/missing, adapter delegation). 367/367 renderer pass.

  **Closes:** docs/gravitino-gaps.md G23 (multi-step Create Catalog wizard), G24 (test-connection control).

## 0.32.0

### Minor Changes

- 7e20a34: Новый primitive `PermissionMatrix` — resource × privilege matrix для Access/RBAC модулей.

  **Shape (value):**

  ```js
  [
    { type: "metalake", name: "prod_lake", privileges: ["select", "modify"] },
    { type: "catalog", name: "hive_warehouse", privileges: ["select"] },
    { type: "schema", name: "*", privileges: ["select", "create"] },
  ];
  ```

  **Фичи v1:**

  - **Canonical privilege order**: `select / read / create / modify / write / delete / use / manage / execute / *`. Non-canonical — в конец alphabetical.
  - **Wildcard handling**: `name: "*"` → "type (all)" label italic; `privileges: ["*"]` → все columns показываются granted (hollow dot ○ vs explicit ●). Legend объясняет.
  - **Resource filter**: search по type или name, case-insensitive. Counter `N / M resources · K privileges`.
  - **Read-only mode (default)**: `●` explicit / `○` wildcard-granted / пусто. Edit mode (`readOnly: false` + `onChange`): checkboxes, wildcard-inherited disabled.
  - **Explicit privileges prop**: если автор задаёт `privileges: ["select", "modify", "delete"]` — эти columns показываются даже если в value не упоминаются.
  - **Adapter delegation**: `ctx.adapter.getComponent("primitive", "permissionMatrix")` — AntD Table с checkbox columns и т.п.

  **Use-case:** Gravitino `Role.securableObjects` (G35 P0). Classical RBAC matrix visualization — AWS IAM, K8s RBAC bindings, DBaaS role editors.

  **Активация через field.primitive hint** (core@0.53.0):

  ```js
  // в host ontology wrapper:
  Role.fields.securableObjects.primitive = "permissionMatrix";
  ```

  **Tests:** +15 unit (rendering rows/types/wildcards, canonical order, explicit privileges prop, search filter, edit mode toggle/add, wildcard privilege granting, adapter delegation). 351/351 renderer pass.

## 0.31.0

### Minor Changes

- 0a5e3fc: Новый primitive `DataGrid` — enhanced table с per-column sort / filter / visibility toggle.

  **Shape:**

  ```js
  {
    type: "dataGrid",
    items: [{ id, name, type, provider, ... }],
    columns: [
      { key: "name",     label: "Name",     sortable: true, filterable: true },
      { key: "type",     label: "Type",     filter: "enum", values: ["a","b"] },
      { key: "provider", label: "Provider", sortable: true, filterable: true, align: "right" },
    ],
    emptyLabel?: "Нет данных",
    onItemClick?: (item) => ...,  // function OR declarative nav spec
  }
  ```

  **Фичи v1:**

  - **Sort**: click на sortable header toggle'ит asc→desc→none, aria-sort выставляется.
  - **Filter**: text-input per filterable column (case-insensitive substring); `filter: "enum"` даёт `<select>` с `values`.
  - **Column visibility**: если >3 columns — ColumnMenu dropdown с checkbox'ами для show/hide.
  - **Row click**: `onItemClick` function (прямой callback) OR declarative `{action:"navigate", to, params}` с `item.fieldName` binding.
  - **Cell rendering**: arrays → chip-list (first 3 + `+N`), objects → code-snippet, `format: "badge"` → pill.
  - **Adapter delegation**: `ctx.adapter.getComponent("primitive", "dataGrid")` — AntD native Table и др.

  **Не в scope v1 (future):**

  - Column resize drag (требует AntD X-Table)
  - Column pinning (AntD feature, adapter-delegation задача)
  - Virtualization 1000+ rows (rc-virtual-list adapter-level)

  **Use-case:** Gravitino catalog_list нуждается в Tags/Policies columns + Type/Provider filters (G20/G21/G38). DataGrid даёт все три сразу.

  **Tests:** +16 unit (rendering, empty, chip-list, sorting asc/desc/none, filtering text/enum, column visibility toggle, row click function/declarative, adapter-delegation). 336/336 renderer pass.

## 0.30.0

### Minor Changes

- 7620fe1: Новый primitive `SchemaEditor` — render/edit списка column-определений с composite parametric types.

  **Shape value** (array of column defs):

  ```js
  [
    { name: "id", type: "bigint", nullable: false, comment: "primary key" },
    { name: "email", type: "varchar", length: 320 },
    { name: "balance", type: "decimal", precision: 10, scale: 2 },
    { name: "ts", type: "timestamp", nullable: false },
  ];
  ```

  **Поддерживаемые types:** `string`, `varchar(N)`, `char(N)`, `text`, `integer`, `bigint`, `smallint`, `tinyint`, `decimal(P,S)`, `float`, `double`, `boolean`, `timestamp`, `date`, `time`, `binary`. Parametric types показывают доп. inputs для N/P/S.

  **Modes:** read-only (table с bold names + code-badge types) vs edit (text inputs + select + parametric numbers + add/remove-row buttons).

  **Адаптерная делегация:** `ctx.adapter.getComponent("primitive", "schemaEditor")` — если адаптер даёт component, delegate'ится. Иначе built-in minimal table UI.

  **Scope intentional:** primitive-level + тесты. Composite nested types (`list<T>`, `map<K,V>`, `struct<...>`, `union`) — future work; требуют nesting UI с expand/collapse. Host-integration (use в archetype-form когда field имеет column-schema role) — отдельный host PR.

  **Обнаружено:** Gravitino dogfood-спринт Stage 3 — Table entity имеет `columns: type: "json"` (array из column defs с varchar(N)/decimal(P,S) типами). Default renderer показывает JSON blob; SchemaEditor даёт structured view.

  **Tests:** +16 unit (read-only rendering: bigint/varchar/decimal parametric display, edit-mode: name/type/params/nullable/comment inputs, add/remove rows, invalid row filtering, adapter delegation). 320/320 renderer pass.

## 0.29.0

### Minor Changes

- 21c497d: Новый primitive `Breadcrumbs` — вертикальная навигационная цепочка с click'абельными предками.

  Node-shape:

  ```js
  {
    type: "breadcrumbs",
    items: [
      { label: "Metalakes", projection: "metalake_list" },
      { label: "prod", projection: "metalake_detail", params: { metalakeId: "m1" } },
      { label: "Catalog", projection: "catalog_detail", params: { catalogId: "c1" } },
    ],
    separator: "›", // optional (default "›")
  }
  ```

  **Фичи:**

  - Последний item — current (auto, если не помечен `current: true` явно). Current не кликабелен, `aria-current="page"`, bold.
  - Остальные — button'ы; click → `ctx.navigate(projection, params)`.
  - Custom separator для кастомных стилей ("/", "→", "·").
  - Adapter delegation через `ctx.adapter.getComponent("primitive", "breadcrumbs")` — если адаптер даёт native Breadcrumb (AntD, MUI), рендер через него. Иначе SVG-fallback с CSS-tokens.
  - A11y: `<nav aria-label="Breadcrumbs">` + `<ol>` + `aria-current="page"` на текущем.

  **Использование:**

  - Host'ы (V2Shell, custom layouts) могут держать breadcrumb-state и передавать в primitive через artifact slot.
  - Pattern `cross/breadcrumbs-nav` (опционально) может auto-injection'ом добавлять breadcrumb в artifact на основе nav-graph — future work.

  **Demo:** Gravitino dogfood-спринт 2026-04-23. Иерархия Metalake → Catalog → Schema → Table требует visual persistence текущей позиции — breadcrumbs это классическое решение (см. AWS Console / Gravitino WebUI v2).

  **Tests:** +7 unit (render, click-navigate, custom separator, adapter-delegation, a11y, explicit current override).

## 0.28.0

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

## 0.27.0

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

## 0.26.0

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

- 6e3942a: **Inline primitives `statistic` / `countdown` + `Badge` toneMap/toneBind** (Workzilla findings P1-1 / P1-3, backlog §8.4 / §8.6).

  **8.4 — Inline primitives:**

  - Новый primitive `Statistic` (atoms.jsx): `{title, prefix, suffix, bind, precision, size}`. Delegates в `getAdaptedComponent("primitive","statistic")` (AntD-адаптер уже предоставляет AntdStatistic); fallback — inline div с title/value/prefix/suffix/uppercase-label.
  - Зарегистрирован в `PRIMITIVES.statistic` — теперь работает inline внутри `card.children` / `column.children`, раньше падал в "Unknown type".
  - `PRIMITIVES.countdown = Timer` — alias для семантической ясности (`{type:"countdown", bind:"deadline"}` vs `{type:"timer"}`).

  **8.6 — Badge toneMap/toneBind:**

  `Badge` primitive расширен tone-резолвером:

  ```js
  { type: "badge", bind: "status", toneMap: { draft: "neutral", published: "success" } }
  { type: "badge", bind: "status", toneBind: "_tone" } // tone берётся из item._tone
  ```

  Приоритет: `node.color` → `toneMap[rawVal]` → `toneBind`-resolve → адаптер-fallback.

  Fallback-рендер (без адаптера) имеет mapping tone → colors: `success` (зелёный), `warning` (оранжевый), `danger` (красный), `info` (голубой), `neutral` (серый), `default` (индиго). AntD/Mantine Badge получает `color={tone}` и маппит в свои цветовые роли.

  Закрывает: «все статусы в Workzilla показывают разные цвета без client-side augment'а».

  Тесты: 10 новых unit (Badge toneMap/toneBind happy-path + explicit color priority + unknown value fallback; Statistic render с title/prefix/suffix). Renderer suite: 287 → 297.

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

## 0.25.0

### Minor Changes

- 90591fe: SubCollectionSection: применение author-level `sort`, `where`, `terminalStatus` +
  `hideTerminal` с toggle-кнопкой (backlog §4.7 / §4.8 / §6.7).

  **Core** уже emitil эти поля в `section` shape (через `assignToSlotsDetail::buildSection`),
  но renderer их игнорировал. Теперь:

  - `section.where`: строка (eval `item.status !== 'withdrawn'`) или object (простые equalities).
  - `section.sort`: `"-createdAt"` / `"+price"` / `"field"` — сортировка после filter.
  - `section.terminalStatus` + `hideTerminal:true`: терминальные items (enum value из
    `withdrawn`/`cancelled`/`rejected`/`expired`/…) скрываются по default; toggle-кнопка
    «Показать все (+N)» раскрывает, «Скрыть завершённые» — снова прячет.

  Freelance applicability: `task_detail.responses` получит hide-withdrawn по default,
  `deal_detail.transactions` sorted по `-createdAt`, etc.

## 0.24.0

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

## 0.23.0

### Minor Changes

- bae448c: ConfirmDialog: поддержка `__irr`/`irreversibility:"high"` + configurable
  `confirmLabel` + корректный default tone.

  **Before:** hardcoded label "Удалить" вне зависимости от семантики (абсурдно
  для `confirm_deal`, `accept_result` и других non-destructive high-irr intents).
  Нет warning panel с reason.

  **Changes:**

  - `spec.confirmLabel` — явный override текста кнопки.
  - Default label: "Подтвердить" для `α ∈ {add, replace}`; "Удалить" для
    `α:"remove"` или `spec.danger:true`.
  - `spec.irreversibility === "high"` ИЛИ `spec.__irr.point === "high"` ИЛИ
    `item.__irr.at !== null` → рендер warning panel с иконкой ⚠️ и `reason`
    (если задан в `spec.__irr.reason` / `item.__irr.reason`).
  - Button tone: danger-red только для `isDestructive` (α='remove' или danger:true);
    иначе — primary-blue для high-irr подтверждений.

  Закрывает freelance backlog §3.3 для confirm-dialog pathway.

## 0.22.0

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

## 0.21.1

### Patch Changes

- 770d334: Fix rules-of-hooks violation в List primitive. `useRef`/`useEffect` были
  размещены ПОСЛЕ conditional early-return `if (items.length === 0 && node.empty)`.
  При переходе empty ↔ non-empty React падал с "Rendered more/fewer hooks than
  during the previous render", catalog показывал ArchetypeErrorBoundary.

  Fix: hooks вызываются безусловно ДО early-return. 3 regression-теста:
  empty→non-empty, non-empty→empty, filter-полностью-отсеивает.

## 0.21.0

### Minor Changes

- 59715cd: Promote review-criterion-breakdown candidate → stable с полной реализацией.

  **core:** новый stable pattern (detail archetype) с `structure.apply` — prepend'ит
  в `slots.sections` section `{type: "criterionSummary", subEntity, fkField, criteria,
title}`. Trigger: detail-проекция с sub-entity имеющим ≥3 criterion-полей
  (_\_rating / _\_score суффикс, whitelist quality/punctuality/..., или
  fieldRole:"rating"). Убран из curated candidate bank.

  **renderer:** новый primitive `CriterionSummary` — runtime compute avg по каждому
  criterion'у из `world[pluralized(subEntity)]`. Horizontal bar-chart с auto-scale
  (5 vs 10). Зарегистрирован в `PRIMITIVES.criterionSummary`.

## 0.20.0

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

## 0.19.0

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

## 0.18.0

### Minor Changes

- 4668870: feat(parameter): `control: "methodSelect"` — radio-card grid с группами (UI-gap #4, Workzilla-style payment-method selector).

  Новый built-in control type `methodSelect`. Рендерит grid кликабельных radio-card'ов с icon + label + sublabel, группированных по `option.group`.

  ```js
  {
    name: "method",
    control: "methodSelect",
    label: "Способ оплаты",
    options: [
      { id: "kassa",  label: "Мир/Visa/Mastercard", sublabel: "Kassa",
        icon: "💳", group: "Банковская карта" },
      { id: "sbp",    label: "СБП", sublabel: "Система быстрых платежей",
        icon: "⚡",  group: "Банковская карта" },
      { id: "paypal", label: "PayPal", icon: "💰",
        group: "Электронные деньги" },
      { id: "stripe", label: "Visa/Mastercard", sublabel: "Stripe",
        icon: "💳", group: "Другое" },
    ],
  }
  ```

  ### Поведение

  - Grid с `auto-fill, minmax(220px, 1fr)` — адаптивный layout.
  - Группы отрисовываются как отдельные секции с header; header скрывается для unlabeled group.
  - Порядок групп — по первому появлению в options (stable).
  - Accessibility: `role="radiogroup"` / `role="radio"` / `aria-checked`.
  - Click → `onChange(option.id)`.
  - Active-state подсвечивается через `--idf-accent` / `--idf-accent-soft`.

  ### Token Bridge

  `--idf-accent` / `--idf-accent-soft` / `--idf-surface-soft` / `--idf-text` / `--idf-text-muted` / `--idf-danger` — согласованно в 4 UI-kit'ах.

  ### Тесты

  +8 тестов в `MethodSelectControl.test.jsx`. 230 renderer passing.

  ### Применение

  Workzilla-style wallet top-up (скриншот 3: Банковская карта / Электронные деньги / Другое). Freelance `top_up_wallet_by_card.parameters.method: { control: "methodSelect", options: [...] }`.

## 0.17.0

### Minor Changes

- 143af87: feat(primitive): `carousel` — ротирующий hero-banner (UI-gap #5, Workzilla-style).

  Новый primitive в `PRIMITIVES.carousel`. Node-shape:

  ```js
  {
    type: "carousel",
    slides: [
      {
        eyebrow: "Наши преимущества",
        title: "Новое задание каждые 28 секунд",
        subtitle: "Исполнители подключаются моментально",
        illustration: "/clock.svg",
        background: "linear-gradient(90deg, #e8f4ff, #f8fbff)",
      },
      { title: "Одобрено 1200 заказчиков", illustration: "/star.svg" },
      { title: "Гарантия возврата", illustration: "/shield.svg" },
    ],
    intervalMs: 5000,    // опц., дефолт 5000
    autoplay: true,      // опц., дефолт true
    height: 140,         // опц., дефолт 140
  }
  ```

  **Shortcut slide**: `{ eyebrow, title, subtitle, illustration, background }` — рендерится inline.

  **Complex slide**: `{ render: { type: "row", children: [...] } }` — произвольный SlotRenderer-node.

  ### Поведение

  - **Auto-rotation** когда `slides.length > 1` и `autoplay !== false`; отключается если один слайд.
  - **Индикатор** под слайдом (`role="tablist"` + `aria-selected`): dots для неактивных, pill для активного.
  - **Manual control**: click по индикатору переключает active.
  - Token Bridge: `--idf-surface-soft` / `--idf-accent` / `--idf-text` / `--idf-text-muted` — автоматически вписывается в 4 UI-kit'а.

  ### Использование

  Обычно в `projection.hero`:

  ```js
  task_catalog_public: {
    kind: "catalog",
    mainEntity: "Task",
    // ...
    hero: {
      type: "carousel",
      slides: [...],
    },
  }
  ```

  Тесты: +10 в `Carousel.test.jsx`. 195 renderer passing.

## 0.16.0

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
