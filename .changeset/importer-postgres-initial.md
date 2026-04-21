---
"@intent-driven/importer-postgres": minor
"@intent-driven/cli": minor
---

`@intent-driven/importer-postgres@0.1.0` — Postgres schema → IDF ontology. Читает `information_schema`, маппит tables/columns в entities/fields с inference семантических ролей (`primary-title`, `money`, `date-witness`, `contact`, `status-flag`). FK → `entity.relations` для R8 Hub-absorption hint'ов. Генерит seed CRUD intents (create/update/remove/list/read) на каждую сущность.

`@intent-driven/cli` — добавлена subcommand `idf import postgres --url $DATABASE_URL [--out path] [--schema name]`. Часть Phase A Этапа 2 плана "IDF standalone Retool-alternative" (2026-04-21).

Проверено на Docker Postgres 16-alpine с 5-table e-commerce schema — сгенерирована ontology с 5 entities / 25 intents / 5 FK-relations / 6 inferred semantic-role patterns. 31 unit/integration test зелёный.
