# @intent-driven/importer-prisma

## 0.4.0

### Minor Changes

- 6e3942a: **Importers автоматически выводят R9 compositions из FK-relations** (Workzilla dogfood findings §8.7).

  Раньше importer'ы (postgres / prisma) эмитили `entity.relations[fkField] = {entity, kind:"belongs-to"}`, но НЕ `ontology.compositions`, которые нужны `crystallize_v2` для R9 auto-resolve в detail-views (task_detail показывает task.customer.name / task.responses).

  Автор был вынужден вручную дополнять compositions после import'а — иначе detail-витнессы с dotted-путями (`customer.name`, `responses.count`) ломались.

  **Новый shared helper `buildCompositions(entities)`** (postgres + prisma — копия для independency):

  Для каждого `child.relations[fk] = {entity: Parent, kind: "belongs-to"}` эмитит двустороннюю связь:

  - `compositions.Child: [{ entity: Parent, as: <fk-без-Id>, via: fk, mode: "one" }]`
  - `compositions.Parent: [{ entity: Child, as: <child-plural>, via: fk, mode: "many" }]`

  Пример: `Task.customerId → User`:

  - `compositions.Task: [{ entity:"User", as:"customer", via:"customerId", mode:"one" }]`
  - `compositions.User: [{ entity:"Task", as:"tasks", via:"customerId", mode:"many" }]`

  Алиасы: camelCase `customerId → customer`, snake_case `user_id → user`, plural `Category → categories`.

  Интегрировано в `buildOntology` (postgres) и `importPrisma` (prisma) — compositions попадают в `ontology.compositions`, если хоть одно belongs-to найдено. Пустой случай — не добавляется (no-op для ontology без FK).

  Тесты: 7 новых unit (buildCompositions) + проверка в postgres `buildOntology.test.js` что compositions выведены двусторонне. Остальные 100 importer-тестов — без изменений.

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

- d9ad4c8: `@intent-driven/importer-prisma@0.1.0` — Prisma schema (`.prisma`) → IDF ontology. Парсит через `@mrleebo/prisma-ast`. Мапит scalar types (String/Int/BigInt/Float/Decimal/Boolean/DateTime/Json/Bytes) в IDF field types с role-inference (primary-title / date-witness / contact / money / status-flag). `@id` / `@updatedAt` / `@default(now())` → `readOnly`. `@default("literal")` → IDF default. `@relation(fields: [fk], references: [id])` → `entity.relations[fk] = { entity, kind: "belongs-to" }`. Self-ref и named relations поддерживаются. List-relations (Post[]) игнорируются. Seed CRUD intents (5 на entity).

  `@intent-driven/cli` — subcommand `idf import prisma --file <path> [--out <path>]`.

  Phase E Этапа 3. Проверено на real 5-model e-commerce schema: User/Category/Product/Order/OrderItem с 4 FK relations (включая self-ref Category.parentId).
