---
"@intent-driven/renderer": minor
---

Новый primitive `Breadcrumbs` — вертикальная навигационная цепочка с click'абельными предками.

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
