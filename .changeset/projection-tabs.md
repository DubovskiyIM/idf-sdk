---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

feat(projection): `projection.tabs` — filter-views как табы над catalog (UI-gap #1, Workzilla-style).

Автор декларирует несколько filter-вариантов на одной projection'е; renderer показывает tab-bar над списком, клик переключает активный фильтр.

```js
projection = {
  kind: "catalog", mainEntity: "Task",
  filter: "item.customerId === viewer.id",   // базовый фильтр (применяется первым)
  tabs: [
    { id: "new",     label: "+ Новое",  filter: "item.status === 'draft'" },
    { id: "open",    label: "Открытые", filter: "item.status === 'published'" },
    { id: "history", label: "История",  filter: { field: "status", op: "in", value: ["closed", "completed"] } },
  ],
  defaultTab: "open",   // опц., иначе первый
}
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
