---
"@intent-driven/core": minor
---

feat(projection): `projection.hero` — authored node (UI-gap #9, Workzilla-style horizontal banner).

До: `slots.hero` инициализировался пустым массивом; только `heroCreate`-archetype intent'ы могли туда попасть. Авторский `projection.hero: {...}` полностью игнорировался.

После: авторский hero-node (или array) кладётся в `slots.hero` **первым**. Если authored присутствует, `heroCreate` fallback'ит через стандартную логику (в toolbar как `intentButton`), потому что `slots.hero.length === 0` guard больше не срабатывает.

```js
projection = {
  kind: "catalog", mainEntity: "Task",
  hero: {
    type: "carousel",
    slides: [
      { eyebrow: "Наши преимущества", title: "Новое задание каждые 28 секунд" },
      { eyebrow: "Безопасность", title: "Escrow на сумму сделки" },
    ],
  },
}
```

Принимает:
- **Object** (single node) — обёртка в `[node]`.
- **Array** — pass-through as-is.
- **`null` / `undefined`** — legacy `hero:[]` initialized.

### Author-override precedence (catalog hero slot)

`projection.hero` authored → всегда побеждает; `heroCreate` creator-intent fallback'ит в toolbar.

### Тесты

+5 `assignToSlotsCatalog.hero.test.js` (1003 passing).

### Применение

Freelance `task_catalog_public.hero: { type: "carousel", slides: [...] }` — horizontal rotating banner над списком задач (workzilla-скриншот 4 «Наши преимущества — Новое задание каждые 28 секунд»). До фикса carousel приходилось размещать в sidebar'е как обходной путь.
