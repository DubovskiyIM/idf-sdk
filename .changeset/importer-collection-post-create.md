---
"@intent-driven/importer-openapi": minor
---

`POST /parent/{id}/collection` → `createEntity` с α=insert + creates (G-K-8).

Раньше importer для `POST /admin/realms/{realm}/users` выдавал intent `usersUser` с `α=replace` без `creates`. `analyzeIntents` в core ищет creators через `intent.creates` (не через `α=insert`) — R1 catalog-rule не срабатывал, nested collections не получали catalog-проекций (только detail). Host'ы заводили explicit name-mapping `COLLECTION_POST_TO_CREATE` как host-fix.

Новая эвристика в `pathToIntent`: если POST на path'е, заканчивающемся plural-collection (через `isPluralCollection(seg)` — singularize(seg) меняет форму), и есть `{param}` перед ним → intent становится `create${entity}` с `α=insert`, `creates=entity`, `particles.confirmation: enter`.

Non-plural legacy action'ы (`/tasks/{id}/custom-endpoint`) продолжают замеряться как replace.

## Эффект Keycloak

17+ explicit mapping'ов в `intents.js::COLLECTION_POST_TO_CREATE` становятся X1 — удалить после bump. `createUser`, `createGroup`, `createRole`, `createIdentityProvider`, `createClientScope`, `createComponent`, `createOrganization`, `createWorkflow`, и т.д. теперь создаются importer'ом из path-structure.

## Options

- `opts.collectionPostAsCreate: false` — back-compat opt-out. Legacy shape `usersUser` с α=replace.

## Back-compat

- POST top-level (`/tasks`) — не меняется (как и раньше → createTask)
- POST с action-verb (`/users/{id}/reset-password`) — detected в G-K-2 (PR #251)
- POST с non-plural segment (`/tasks/{id}/custom-endpoint`) — legacy replace
- `operation.operationId` override'ит name, но alpha/creates всё равно правильные для R1
