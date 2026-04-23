---
"@intent-driven/renderer": minor
"@intent-driven/adapter-antd": minor
---

DataGrid: поддержка `col.kind: "actions"` — per-row кнопки, вызывающие intents.

**Problem:** DataGrid'ы с row-click'ом отлично работают, когда таблица ведёт в detail. Но **per-item actions** (Grant Role, Revoke Role, Download, Approve) требовали отдельной кнопки в каждой строке — не покрывалось API.

**Shape extension:**
```js
columns: [
  { key: "name", label: "Name", sortable: true, filterable: true },
  {
    key: "_actions",
    label: "Actions",
    kind: "actions",
    actions: [
      {
        intent: "grantRoleToUser",
        label: "Grant Role",
        params: {
          user: "item.name",               // item.X резолвится из record
          metalake: "route.metalakeId",    // route.X из ctx.routeParams
        },
      },
      {
        intent: "revokeRoleFromUser",
        label: "Revoke",
        params: { user: "item.name" },
        danger: true,                      // visual hint (red)
        disabled: (item, ctx) => !item.roles?.length,  // optional predicate
      },
    ],
  },
]
```

**Params resolution** (совпадает с onItemClick contract):
- `"item.X"` → `record[X]`
- `"route.Y"` → `ctx.routeParams[Y]`
- остальное — literal

**Implementation:** новый `ActionCell` в renderer DataGrid.jsx + `AntdActionCell` в
adapter-antd. Click.stopPropagation предотвращает row-onClick fire одновременно.
Action-column автоматически не sortable / не filterable (нет скалярного значения).

**Tests:**
- 402 renderer (6 новых для actions column: render, click → exec, stopPropagation, route-param resolve, disabled predicate, no-sort/filter на actions col)
- 45 adapter-antd (сохранены)

**Closes:** Gravitino G34 (per-item Grant Role action в user_list/group_list).
