---
"@intent-driven/importer-openapi": minor
---

`inferFieldRoles` — name-pattern эвристика для `fieldRole: secret / datetime / email / url` (G-K-7).

Raw OpenAPI schema не несёт semantic hint для полей типа `password`, `createdAt`, `email`, `rootUrl` — после импорта host видит plain-string. Renderer primitives (`secret-mask`, `date-relative`, `email-link`) требуют `fieldRole` для корректной визуализации.

Новый step 6 в `importOpenApi` (после markEmbedded):
- **SECRET:** `password`, `*Password`, `secret`, `*Secret`, `token`, `registrationAccessToken`, `store_password`, `key_password`, `clientSecret`, `*ApiKey`, `*AccessKey`
- **DATETIME:** `*Date`, `*Timestamp`, `expir*`, `*ExpiresAt`, `notBefore`, `updated_at`, `created_at`, `deleted_at`, `sentDate`, `lastUpdatedDate`, `createdTimestamp`, `*Time`
- **EMAIL:** `email`, `*Email`
- **URL:** `*Url`, `*Uri`, `redirectUris?`, `webOrigins`, `*Endpoint`, `href`, `callback`

Conservative:
- `fieldRole` уже задано → не перезаписываем (authored wins)
- **Numeric guard:** `accessTokenLifespan` (type:integer) НЕ secret даже если имя match'ит `*Token` pattern. Та же защита для `refreshTokenMaxReuse`, `createdTimestamp` (counter). Любой numeric type (`number`, `integer`, `int`, `int32`, `int64`, `float`, `double`) пропускает inference.

Эффект Keycloak: 53+ полей получают корректный hint автоматически. Host `applyFieldRoleHints` в keycloak ontology.js становится X1 — удалить после bump.

## Exports

```js
import { inferFieldRole, inferFieldRolesForEntities } from "@intent-driven/importer-openapi";
```

## Options

- `opts.inferFieldRoles: false` — back-compat opt-out
