---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

feat(projection): `projection.emptyState` — richer empty-state для catalog (UI-gap #8, Workzilla-style).

До: catalog рендерил дефолтный `"Пусто"` mute-текст при пустом результате.
После: автор декларирует богатый empty-state:

```js
projection = {
  kind: "catalog",
  mainEntity: "Task",
  emptyState: {
    illustration: "/empty-tasks.svg",   // URL или React-нода
    title: "У вас пока нет заданий",
    hint: "Ваши открытые задания появятся здесь",
    cta: { label: "Дать задание", intentId: "create_task_draft" },
  },
}
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
