---
"@intent-driven/core": patch
---

`detectForeignKeys` распознаёт `kind: "foreignKey"` + `references` маркер (G-K-9 follow-up).

OpenAPI-importer кладёт FK как `type: "string"` + `kind: "foreignKey"` + `references: "Entity"` + `synthetic: "openapi-path"`. Раньше `detectForeignKeys` искал только `type === "entityRef"` — все path-derived FK из Keycloak/Gravitino-импортов были невидимы для downstream R2/R4/R8.

Эффект: R8 hub-absorption теперь автоматически срабатывает для entity с ≥2 child'ами через explicit FK-marker. В Keycloak host это даёт schлопование 10 → 4-5 nav-tab'ов (User/Client/Group/Role/ClientScope/Component абсорбируются в `realm_detail` как hubSections).

`references`-field резолвится case-insensitive, чтобы `references: "identityprovider"` тоже дошло до canonical `IdentityProvider`. Broken marker'ы (kind без references) молча игнорируются — fallback на существующую entityRef-ветку.
