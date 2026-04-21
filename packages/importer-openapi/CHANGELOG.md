# @intent-driven/importer-openapi

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
