# Changelog

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

- Первый релиз: `shadcnAdapter` + `ShadcnAdapterProvider` + `theme.css`
- Doodle/sketch стилистика с Tailwind-токенами
- CSS-тема экспортируется через `@intent-driven/adapter-shadcn/styles.css`
- Radix UI primitives под капотом (dialog, dropdown, select, tabs, avatar)
