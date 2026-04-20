---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

feat(projection): `projection.sidebar` — static-content блоки слева от catalog (UI-gap #2, Workzilla-style).

Авторы декларируют колонку static-content блоков (tutorial / promo / examples) рядом с catalog body.

```js
projection = {
  kind: "catalog", mainEntity: "Task",
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
}
```

### Изменения

**core (`assignToSlotsCatalog.js`):** `projection.sidebar` → `slots.sidebar: []` pass-through. Non-array value graceful-падает в пустой массив.

**renderer (`ArchetypeCatalog.jsx`):** рендерит `<aside>` колонку шириной 260px слева от content area (hero + body), когда `slots.sidebar` не пустой. `aria-label="Боковая панель"`. Background через `--idf-surface-soft` / `--idf-surface` fallback + borderRight `--idf-border`.

### Тесты

- Core: +3 теста `assignToSlotsCatalog.sidebar.test.js` (971 passing).
- Renderer: +3 теста `CatalogSidebar.test.jsx` (225 passing).

### Применение

Workzilla-style (скриншот 1): слева "Как поручить задание?" (tutorial-card с play-button), "Подарите другу и себе по 100 рублей" (promo-card), "Примеры заданий" (list карточек задач). Все static-content, не intent-driven.
