# @intent-driven/importer-openapi

## 0.12.0

### Minor Changes

- 465c3b4: feat(importer-openapi): mergeK8sCrdDuplicates — автомёрдж K8s CRD pattern

  Kubernetes CRDs именуются в OpenAPI как `v<digits>(alpha|beta)?<digits>?<PascalName>`.
  Importer создаёт две раздельные entities:

  - path-derived `Application` (fields:{id}, kind:"internal") из `/api/v1/applications/{name}`
  - schema-derived `v1alpha1Application` (все поля, kind:"embedded")

  Теперь `mergeK8sCrdDuplicates(entities)` автомёрджит такие пары:

  - stub.id побеждает (синтетический PK)
  - full.fields заполняют все недостающие поля
  - kind: "internal" (unmark embedded из full)
  - full entity сохраняется для wrapper-refs (`v1alpha1ApplicationList.items[]`)
    — opt-in `opts.stripOriginal: true` удаляет

  Case-insensitive lookup для PascalCase mismatch (`Applicationset` stub ←
  `ApplicationSet` schema). Не handled автоматически: name mismatch типа
  `Project` ← `v1alpha1AppProject` или semantic alias `Gpgkey` ←
  `v1alpha1GnuPGPublicKey` — требует host-override.

  Closes ArgoCD G-A-1 (host `K8S_CRD_MERGE` table становится removable
  после применения этого helper'а в host reimport pipeline).

  По образцу `mergeRepresentationDuplicates` (Keycloak G-K-1).

## 0.11.0

### Minor Changes

- 25d4176: `POST /parent/{id}/collection` → `createEntity` с α=insert + creates (G-K-8).

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

## 0.10.0

### Minor Changes

- 8add0e5: `inferFieldRoles` — name-pattern эвристика для `fieldRole: secret / datetime / email / url` (G-K-7).

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
  import {
    inferFieldRole,
    inferFieldRolesForEntities,
  } from "@intent-driven/importer-openapi";
  ```

  ## Options

  - `opts.inferFieldRoles: false` — back-compat opt-out

## 0.9.0

### Minor Changes

- c2bf65d: `markEmbeddedTypes` — orphan entities без intent.target/creates помечаются `kind: "embedded"` (G-K-3).

  OpenAPI spec'ы часто определяют helper-schemas (AccessToken, AuthDetailsRepresentation, AbstractPolicyRepresentation, ...), нужные как $ref-target'ы в других schemas, но не покрытые HTTP endpoint'ами. Без маркера `kind:"embedded"` они попадают в ROOT_PROJECTIONS и создают nav-noise.

  Новый step 5 в `importOpenApi` (после dedup):

  1. Собираем set всех `intent.target` + `intent.creates`
  2. Для каждой entity: если не в set И `kind: undefined | "internal"` → помечаем `kind: "embedded"`
  3. Explicit kind'ы (`reference` / `assignment` / `mirror` / `embedded`) не переопределяются

  Эффект Keycloak: 75 orphan'ов (44.6% entities) автоматически становятся embedded. Host `markOrphansEmbedded` helper в keycloak ontology.js становится X1 — удалить после bump.

  ## Options

  - `opts.markEmbedded: false` — back-compat opt-out

  ## Exports

  ```js
  import { markEmbeddedTypes } from "@intent-driven/importer-openapi";
  ```

## 0.8.0

### Minor Changes

- 76e2655: Detect action-endpoints: `/collection/{param}/action-verb` → intent на parent, не новая entity (G-K-2).

  OpenAPI path'ы вида `/users/{user}/reset-password`, `/clients/{id}/test-nodes-available`, `/authentication/executions/{id}/lower-priority` — это action'ы над identified resource, а не отдельные entity. Раньше `entityNameFromPath` брал последний non-`{}` segment → материализовал `ResetPassword`, `TestNodesAvailable`, `LowerPriority` как top-level entities. В Keycloak это давало 21 лишнюю entity-запись.

  Новый `detectActionEndpoint(path)` возвращает `{ parentEntity, actionSegment, actionName }` если:

  1. Path ends non-`{param}` segment
  2. Перед ним `{param}`
  3. Segment matches verb-regex (conservative explicit list: activate/deactivate/test/reset/send/move/logout/approve/reject/...)

  `pathToIntent` использует detector — для action'а intent.target = parent entity, name = `${actionName}${Parent}`, alpha = `"replace"`. `importOpenApi` step 2 (entity creation) больше не создаёт noise entities — `intent.target` уже short parent name.

  Plural-suffix collections (`role-mappings`, `credentials`) не трогаются — они остаются sub-collection'ами.

  ## Новые exports

  - `detectActionEndpoint(path) → { parentEntity, actionSegment, actionName } | null`

  ## Эффект Keycloak

  - 21 operation-as-entity (ResetPassword / TestNodesAvailable / LowerPriority / Activate / ...) больше не попадают в ontology.entities
  - ROOT_PROJECTIONS whitelist в host keycloak/projections.js можно упростить

  ## Тесты

  `pathToIntent.test.js` — 15 новых: detectActionEndpoint (8 сценариев: Keycloak / plural exclusion / top-level / missing param / verb-list / kebab multi-dash), pathToIntent integration (4), importOpenApi integration (2).

  `@intent-driven/importer-openapi`: **102 passed** (было 87, +15).

## 0.7.0

### Minor Changes

- e71e602: Dedup X / XRepresentation пар при import'е (G-K-1 Keycloak + Gravitino G2).

  OpenAPI spec'ы часто определяют envelope-типы через suffix (`XRepresentation` в Keycloak, `XSpec` / `XStatus` в K8s-style API). Path-derived entity — короткое имя `X`, schema-derived — `XRepresentation` с полным набором полей. Без dedup'а host видит две entity-записи в ontology, и intent.target указывает на почти пустой short-name.

  Новый step 4 в `importOpenApi`:

  1. Для каждой пары `X` / `X${suffix}` — мерджим fields + relations (rep приоритет — полный schema), удаляем long-name. Возвращаем aliases map
  2. `rewriteReferencesByAliases` — все FK, ссылавшиеся на long-name, переписываются на short
  3. `rewriteIntentTargetsByAliases` — intent.target / creates тоже aliased

  Эффект на Keycloak: 224 → 199 entities (-25 dedup), Realm.fields 4 → 155, Client.fields 5 → 48, User.fields 3 → 29. Host-fix `mergeRepresentationDuplicates` в `idf/.worktrees/keycloak-dogfood/src/domains/keycloak/ontology.js` теперь можно удалить (X1).

  ## Options

  - `opts.dedupRepresentations: false` — back-compat, отключает dedup
  - `opts.representationSuffix: "Spec"` — custom suffix для K8s-стиля. Default `"Representation"`

  ## Exports

  Helpers экспортируются отдельно для прямого вызова:

  - `mergeRepresentationDuplicates(entities, opts) → { entities, aliases }`
  - `rewriteReferencesByAliases(entities, aliases) → entities`
  - `rewriteIntentTargetsByAliases(intents, aliases) → intents`

## 0.6.0

### Minor Changes

- b4b9d1a: Поддержка OpenAPI composition (`allOf` / `oneOf` / `anyOf`) в `importOpenApi`.

  **Problem:** до этого релиза каждый `components.schemas.X` превращался в separate entity даже если schema — envelope поверх других (типичный REST pattern: `PolicyBase + CustomPolicyContent → CustomPolicy → Policy`). В ontology попадали пустые entities с только id + synthetic FK.

  **Закрывает:**

  - **Gravitino G32** — PolicyBase/PolicyMetadata/CustomPolicy/Policy теперь сливаются в один Policy entity с полями `name`, `comment`, `policyType`, `enabled`, `audit`, `inherited`, `content`.
  - **Backlog §9.2** — envelope-типы не различались.

  **Реализация:**

  Новая функция `flattenSchema(schema, spec, seen?)`:

  - `$ref` → `resolveRef` + рекурсивный flatten (с cycle-guard через `seen`)
  - `allOf` → merge `properties` + `required` от всех ветвей (+ inline self-properties)
  - `oneOf[single]` → unwrap
  - `oneOf[multiple]` / `anyOf[multiple]` → union properties (first-wins on collision) + добавляет discriminator property с enum из mapping
  - Cycle в `$ref` → `null` (было: throw из resolveRef)

  Вызывается из `importOpenApi` перед `schemaToEntity`:

  ```js
  const flat = flattenSchema(schema, spec);
  const entity = schemaToEntity(name, flat);
  ```

  `schemaToEntity` слегка смягчён — принимает schema без explicit `type` (flatten может опустить hint), пока есть `properties`.

  **Scope:** top-level composition. Nested property schemas (e.g., `Policy.content: { $ref: "#/CustomPolicyContent" }`) остаются как есть — `schemaToEntity` использует только top-level `properties.type/format`, deeper flatten был бы over-engineering.

  **Tests:** 74 (+21): раздельные наборы для backward-compat, `$ref` resolution (+ cycle), allOf (4), oneOf/anyOf (4), полный Gravitino G32 case.

## 0.5.0

### Minor Changes

- 5072b5b: Синтезировать path-derived foreign keys из nested OpenAPI путей.

  До этого patch'а importer видел только компоненты схем — для path-based REST API (Gravitino, K8s, AWS, GitHub, Stripe) иерархия ресурсов живёт в URL (`/metalakes/{m}/catalogs/{c}/schemas`), а не в FK-полях. В итоге после import'а nested entities были flat — pattern `hierarchy-tree-nav` и R8 hub-absorption не срабатывали, tree-nav пустой.

  **Что делает fix:** проходит по всем paths, вычленяет collection → path-param цепочки, и для каждого nested-endpoint'а добавляет на child-entity синтетический FK-поле `<parent>Id` (PascalSingular camelCase):

  ```js
  // /metalakes/{m}/catalogs/{c}/schemas — immediate parent Catalog
  entities.Schema.fields.catalogId = {
    type: "string",
    kind: "foreignKey",
    references: "Catalog",
    synthetic: "openapi-path",
  };
  ```

  Immediate-parent-only (не transitive) — соответствует SQL-конвенции, иначе дубликаты FK на каждый уровень. Идемпотентен: не перезаписывает поля, уже объявленные автором/enricher'ом.

  **Обнаружено:** Gravitino dogfood-спринт 2026-04-22..23. Gravitino = 218 entities, но `findChildEntities("Metalake")` в pattern'е возвращал 0 потому что `metalakeId` field не существовал ни у одной сущности. После fix'а — Catalog/Schema/Table/Fileset/Topic/Model получают correct immediate-parent FK (см. `idf/docs/gravitino-ux-patterns-notes.md` P-1).

  **Новые exports:** `extractCollectionChain(path)`, `extractParentChain(path)`, `synthesizeFkField(entity, parent)` — для внешнего использования (enricher post-processing, custom importer pipelines).

  **Tests:** +18 unit (extractCollectionChain + extractParentChain + synthesizeFkField) + 4 integration (importOpenApi с nested paths) = 60/60 pass.

  **Backward compat:** flat paths (`/tasks`) не затронуты — FK не добавляются если nesting отсутствует. Existing fields никогда не перезаписываются.

## 0.4.0

### Minor Changes

- b8ec84c: **Honor non-`{id}` path parameters в pathToIntent.**

  До этого fix'а importer цеплял path-params **только** если они назывались `{id}`. Спеки с `{villager}`, `{fish}`, `{artwork}`, `{userId}/{postId}` и пр. — теряли все path-params и неправильно классифицировали GET одного ресурса как `list*` (вместо `read*`).

  ### Что изменилось

  - Все `{name}` в path попадают в `intent.parameters[name] = { type: 'string', required: true }`.
  - Семантика `read*` vs `list*`, `update*`, `remove*` теперь определяется по «заканчивается ли path на `/{...}`», а не по литералу `{id}`. Любое имя trailing-param — маркер row-id.
  - Action paths (`/foo/{id}/approve`) — поведение сохранено, плюс `id` теперь тоже попадает в parameters.

  ### Pre/post на Nookipedia API (4393 LOC, 30+ paths с `{villager}/{fish}/{artwork}`)

  - Intents: 17 → **32** (раньше `read*` коллидировали с `list*` под одним именем — оставалось одно)
  - Intents с `parameters`: ~0 → **15**

  ### Backward compat

  `{id}`-based specs продолжают работать без изменений (`/tasks/{id}` POST/PATCH/DELETE/GET — `read/update/remove/createTask` с `parameters.id`). Это **bug fix** (REST `/foo/{anything}` всегда был resource-read, не list), bumpим minor для безопасности.

## 0.3.0

### Minor Changes

- e24d843: Все три importer'а теперь генерируют intent'ы в **native IDF format** одновременно с legacy-плоским форматом:

  - `creates: "Entity"` — для insert-intent'ов
  - `particles.confirmation: "enter"` — feed-signal при создании
  - `particles.effects: [{ target, op }]` — для всех mutation-intent'ов

  Это закрывает gap между importer-generated ontology и `@intent-driven/core` `deriveProjections`: после import'а ontology **сразу кристаллизуется** через R1-R7 правила, и `@intent-driven/server` document/voice handler'ы работают без ручного редактирования `projections`.

  Legacy-формат (`target + alpha + parameters`) сохранён — для обратной совместимости с `@intent-driven/effect-runner-http`.

  E2E проверено на Prisma-schema (2 entities → 5 derived projections → document handler HTTP 200). См. `packages/importer-prisma/VERIFIED-native.md`.

## 0.2.0

### Minor Changes

- b023e14: `@intent-driven/importer-openapi@0.1.0` — OpenAPI 3.x spec → IDF ontology. Парсит YAML/JSON (через `yaml` пакет), резолвит `$ref` (с cycle-detection), схемы → entities с role-inference (primary-title / date-witness / contact / money / status-flag), paths → intents через REST-conventions (POST → create, PATCH/PUT → update, DELETE → remove, GET list/detail). `operationId` побеждает автогенерируемые имена; path-`{param}` → IDF-`:param`; `required: true` proxied в intent.parameters.

  `@intent-driven/cli` — subcommand `idf import openapi --file <path> [--out <path>]`. Поддерживает `.json` и `.yaml`.

  Проверено на real Swagger Petstore 3.0.4 — 13 entities / 19 intents, все `operationId` уважены.

  Phase D Этапа 3 плана "IDF standalone Retool-alternative" (2026-04-21).
