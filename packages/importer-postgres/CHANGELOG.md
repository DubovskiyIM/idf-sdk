# @intent-driven/importer-postgres

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

- a54fb07: `@intent-driven/importer-postgres@0.1.0` — Postgres schema → IDF ontology. Читает `information_schema`, маппит tables/columns в entities/fields с inference семантических ролей (`primary-title`, `money`, `date-witness`, `contact`, `status-flag`). FK → `entity.relations` для R8 Hub-absorption hint'ов. Генерит seed CRUD intents (create/update/remove/list/read) на каждую сущность.

  `@intent-driven/cli` — добавлена subcommand `idf import postgres --url $DATABASE_URL [--out path] [--schema name]`. Часть Phase A Этапа 2 плана "IDF standalone Retool-alternative" (2026-04-21).

  Проверено на Docker Postgres 16-alpine с 5-table e-commerce schema — сгенерирована ontology с 5 entities / 25 intents / 5 FK-relations / 6 inferred semantic-role patterns. 31 unit/integration test зелёный.
