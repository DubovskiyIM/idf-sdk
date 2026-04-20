---
"@intent-driven/renderer": minor
---

feat(primitive): `carousel` — ротирующий hero-banner (UI-gap #5, Workzilla-style).

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
