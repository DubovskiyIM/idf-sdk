# @intent-driven/importer-postgres

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
