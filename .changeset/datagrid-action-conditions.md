---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

fix(datagrid): ActionCell фильтрует actions по per-row conditions

catalog-default-datagrid pattern собирал actions-column из item.intents,
но терял `conditions` (buildItemConditions populated с precondition +
ownership + phase-check). Следствие: кнопка «Оплатить» оставалась в
меню заказа, даже когда status уже paid.

- core/catalog-default-datagrid: propagates `conditions` в action spec
- renderer/DataGrid ActionCell + ActionMenu: фильтрует actions по
  `evalIntentCondition(c, item, ctx.viewer)` как это делает Card
  (containers.jsx). Пустой/отсутствующий conditions = всегда показ
  (backward-compat).

+6 тестов: visible/hidden по статусу, multiple AND, mixed visibility,
fallback на «—» когда все actions отфильтрованы.
