---
"@intent-driven/renderer": minor
---

`PermissionMatrix` рендерит inheritance-badges для row.inheritedFrom (P-K-D Keycloak Stage 9).

Keycloak role-mappings имеют 4 источника: direct / composite / group / client-default. Пользователь должен видеть не только наличие роли, но и причину (почему она attached).

Новое optional поле `value[].inheritedFrom`:

```js
value: [
  { type: "realm", name: "admin", privileges: ["manage"] },                         // direct
  { type: "realm", name: "view",  privileges: ["view"], inheritedFrom: "composite:admin" },
  { type: "client", name: "use",  privileges: ["use"], inheritedFrom: { kind: "group", via: "developers" } },
  { type: "realm", name: "x",     privileges: ["x"],   inheritedFrom: { kind: "client", via: "account" } },
]
```

Shape — string `"kind:via"` или object `{ kind, via }`. Kind tone-map:
- `composite` — violet «через composite: …»
- `group` — blue «через группу: …»
- `client` — green «client-default: …»
- `inherited` / fallback — grey

Badge рендерится рядом с row.name в resource-cell. Unknown kind — использует kind как label. Без `inheritedFrom` — поведение не меняется (back-compat).

## Use-case Keycloak Stage 9

`user_detail` projection может теперь показать полный role-mappings матрикс:
- Realm roles + Client roles (direct/composite/group-inherited)
- Badge подсвечивает источник — user admin видит "почему у него эта роль" и что нельзя remove без отвязки от группы
