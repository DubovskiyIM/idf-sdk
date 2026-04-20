# Changelog

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

## 1.1.1

### Patch Changes

- 1c15071: Привести контракт `Tabs` в shadcn и Apple адаптерах к каноническому: `{ items, active, onSelect, extra }` (как в Mantine и AntD адаптерах + `V2Shell.AdaptedTabs`).

  До этого shadcn и Apple ожидали `{ tabs, value, onChange }` — что приводило к runtime-ошибке `Cannot read properties of undefined (reading 'map')` при использовании этих адаптеров в реальном shell'е (lifequest на shadcn, reflect на Apple). Каллер всегда передаёт `items/active/onSelect`.

  Без breaking change для прямых потребителей — оба адаптера используются только через renderer, который шлёт `items`. Также добавлен дефолт `items = []`.

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

## 0.1.0 — 2026-04-15

- Первый релиз: `appleAdapter` + `AppleAdapterProvider` + `theme.css`
- Apple visionOS-glass эстетика (glassmorphism, backdrop-filter, blur)
- CSS-тема экспортируется через `@intent-driven/adapter-apple/styles.css`
- Radix UI primitives под капотом (dialog, dropdown, select, tabs, avatar)
