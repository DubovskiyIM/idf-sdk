---
"@intent-driven/renderer": minor
"@intent-driven/adapter-antd": minor
"@intent-driven/core": patch
---

DataGrid `col.actions` display modes + row-contextual-actions-menu pattern.

## col.display: "inline" | "menu" | "auto"

`col.kind:"actions"` теперь поддерживает **display mode**:

- `"inline"` — все кнопки в ряд (legacy, без изменений)
- `"menu"` — kebab (`⋯`) или gear (`⚙`, через `col.icon:"gear"`) trigger открывает dropdown
- `"auto"` (default) — inline если `actions.length <= 2`, иначе menu

**Motivation (Gravitino dogfood 2026-04-23, user observation):**
> "шестерёнка вызывает контекстное меню с действиями, возможными к выполнению для сущности в row"

3+ actions per row перегружают визуально admin-таблицы. AntD Pro ProTable / Stripe Dashboard / GitHub PR list / K8s Lens — все дефолтят на dropdown при ≥3 actions.

### Example

```js
{
  key: "_actions",
  label: "Actions",
  kind: "actions",
  display: "menu",        // or "auto"
  icon: "gear",           // "⋯" default, "⚙" если icon:"gear"
  menuLabel: "Row actions",
  actions: [
    { intent: "editUser", label: "Edit", params: { id: "item.id" } },
    { intent: "duplicateUser", label: "Duplicate", params: { id: "item.id" } },
    { intent: "grantRoleToUser", label: "Grant Role", params: { user: "item.name" } },
    { intent: "deleteUser", label: "Delete", params: { id: "item.id" }, danger: true },
  ],
}
```

**Keyboard:** AntD Dropdown — native ARIA menu + keyboard. SVG-fallback — Enter / Escape / click-outside.

## Pattern: row-contextual-actions-menu

Новый curated candidate (catalog-archetype, matching-only). Документирует когда inline → menu rewrite уместен.

Field evidence:
- Apache Gravitino v2 WebUI (user observation 2026-04-23)
- AntD Pro ProTable (`actionRef` ellipsis column)
- Stripe Dashboard (customers / invoices / subscriptions)
- GitHub PR/issues lists
- Linear / Height / Notion database rows
- K8s Lens / Rancher

**Tests:**
- 410 renderer (+8: 6 display-mode, 1 gear icon, 1 disabled-in-menu)
- 45 adapter-antd
- 1201 core (+4: 7 curated candidates + id-uniqueness)
