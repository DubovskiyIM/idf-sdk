---
"@intent-driven/renderer": minor
---

Новый primitive `PermissionMatrix` — resource × privilege matrix для Access/RBAC модулей.

**Shape (value):**
```js
[
  { type: "metalake", name: "prod_lake",      privileges: ["select", "modify"] },
  { type: "catalog",  name: "hive_warehouse", privileges: ["select"] },
  { type: "schema",   name: "*",              privileges: ["select", "create"] },
]
```

**Фичи v1:**
- **Canonical privilege order**: `select / read / create / modify / write / delete / use / manage / execute / *`. Non-canonical — в конец alphabetical.
- **Wildcard handling**: `name: "*"` → "type (all)" label italic; `privileges: ["*"]` → все columns показываются granted (hollow dot ○ vs explicit ●). Legend объясняет.
- **Resource filter**: search по type или name, case-insensitive. Counter `N / M resources · K privileges`.
- **Read-only mode (default)**: `●` explicit / `○` wildcard-granted / пусто. Edit mode (`readOnly: false` + `onChange`): checkboxes, wildcard-inherited disabled.
- **Explicit privileges prop**: если автор задаёт `privileges: ["select", "modify", "delete"]` — эти columns показываются даже если в value не упоминаются.
- **Adapter delegation**: `ctx.adapter.getComponent("primitive", "permissionMatrix")` — AntD Table с checkbox columns и т.п.

**Use-case:** Gravitino `Role.securableObjects` (G35 P0). Classical RBAC matrix visualization — AWS IAM, K8s RBAC bindings, DBaaS role editors.

**Активация через field.primitive hint** (core@0.53.0):
```js
// в host ontology wrapper:
Role.fields.securableObjects.primitive = "permissionMatrix"
```

**Tests:** +15 unit (rendering rows/types/wildcards, canonical order, explicit privileges prop, search filter, edit mode toggle/add, wildcard privilege granting, adapter delegation). 351/351 renderer pass.
