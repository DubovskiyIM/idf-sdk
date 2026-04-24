---
"@intent-driven/renderer": minor
---

feat(datagrid): `column.kind === "badge"` — cell-renderer с colorMap

Новый cell-renderer для status-колонок в status-driven admin UIs (ArgoCD,
Gravitino, Keycloak). Делегирует в существующий `Badge` primitive с tone
mapping:

```js
{ key: "syncStatus", kind: "badge", colorMap: {
    Synced: "success", OutOfSync: "warning", Unknown: "neutral"
}}
```

`colorMap` — alias `toneMap` семантического vocabulary Badge primitive
(success/warning/danger/info/neutral/default). Адаптер (AntD Tag /
Mantine Badge) маппит tone в свой color-набор; SVG-fallback — inline-span
с readable bg/fg. `null`/`""` → em-dash.

Backward-compat: `column.format === "badge"` остаётся (простой inline-span
без tone). Новый `kind: "badge"` — более rich.
