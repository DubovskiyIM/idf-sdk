---
"@intent-driven/renderer": minor
---

Two related DataGrid fixes из Keycloak dogfood-спринта 2026-04-23
(G-K-24 + G-K-25):

**G-K-25: DataGrid::resolveItems применяет node.filter**

Раньше resolveItems возвращал `ctx.world[source]` напрямую — игнорировал
`node.filter`. Filter работал только для `body.type:"list"` (через
`applyFilter` в containers.jsx). Authored projection с
`bodyOverride: { type: "dataGrid", filter: "..." }` не отфильтровывал.

Fix: resolveItems применяет filter (string → evalCondition с row keys
+ viewer/world/viewState; object → evalFilter из core).

**G-K-24: ActionCell auto-open overlay для form-confirmation intents**

Раньше per-row actions делали `ctx.exec(intent, params)` напрямую.
Для intents с `confirmation:"form"` это инвокило effect без UI —
modal не открывался. Update/edit row-actions ломались (button
рендерился, click пустой effect).

Fix: `triggerAction` helper с приоритетом resolution:
1. `action.opens === "overlay"` — explicit override (highest)
2. `ctx.intents[intent].confirmation === "form"` + `ctx.openOverlay`
   → auto-open overlay с key `overlay_${intent}` (default convention)
3. fallback — `ctx.exec` (backward-compat для click-confirmation intents)

Discovered в Keycloak dogfood. Без этих fix'ов admin-style flow
(Click ✎ Изменить → modal с entity.fields, click × Удалить →
ConfirmDialog) не работает.

9 unit-tests + renderer suite 470/470 green.
