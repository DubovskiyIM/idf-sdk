---
"@intent-driven/adapter-antd": minor
---

Adapter-delegation для `Breadcrumbs` primitive — рендер через AntD native `<Breadcrumb />` компонент.

Primitive-shape (renderer@0.29.0):
```js
{
  type: "breadcrumbs",
  items: [{ label, projection, params?, current? }],
  separator?: "›",
}
```

AntD-делегация через `adapter.primitive.breadcrumbs = AntdBreadcrumbs` + capability flag `capabilities.primitive.breadcrumbs: true`. AntD `<Breadcrumb items>` принимает `{title, onClick, href}` — маппим: не-current → `onClick → ctx.navigate(projection, params)`, current → plain title (bold by AntD convention).

**Explicit `current: true` mid-chain** — AntD не поддерживает нативно (полагается на last item = active). Имплементация: находим `currentIdx` (first explicit или last), пост-current item'ы рендерятся без navigation (subtle text).

**Visual effect:** Gravitino breadcrumbs теперь выглядят native в AntD enterprise-fintech theme — separator, hover states, spacing совпадают с остальным UI-kit'ом.

**Tests:** +4 unit (render items, empty null, click-navigate, capability registered). 26/26 pass.
