# @intent-driven/importer-openapi

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
