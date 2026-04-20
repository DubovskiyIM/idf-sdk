---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

feat(projection): `projection.gating` — onboarding prerequisites (UI-gap #6, Workzilla-style).

Декларация шагов к разблокировке проекции — рендерятся как GatingPanel с step-cards и CTA-кнопками. Когда все steps done — panel скрывается автоматически.

```js
projection = {
  kind: "catalog", mainEntity: "Task",
  gating: {
    title: "Необходимые шаги для доступа к заданиям",
    steps: [
      { id: "registration", label: "Регистрация", icon: "👤",
        done: "viewer.registered === true" },
      { id: "test",         label: "Обязательное тестирование", icon: "📝",
        done: "viewer.testPassed === true",
        cta: { label: "Пройти", intentId: "start_test" } },
    ],
  },
}
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
