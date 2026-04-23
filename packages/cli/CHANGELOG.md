# @intent-driven/cli

## 1.4.25

### Patch Changes

- Updated dependencies [2e2a263]
  - @intent-driven/core@0.59.0

## 1.4.24

### Patch Changes

- Updated dependencies [8add0e5]
  - @intent-driven/importer-openapi@0.10.0

## 1.4.23

### Patch Changes

- Updated dependencies [c2bf65d]
  - @intent-driven/importer-openapi@0.9.0

## 1.4.22

### Patch Changes

- Updated dependencies [76e2655]
  - @intent-driven/importer-openapi@0.8.0

## 1.4.21

### Patch Changes

- Updated dependencies [e71e602]
  - @intent-driven/importer-openapi@0.7.0

## 1.4.20

### Patch Changes

- Updated dependencies [ff69fd3]
  - @intent-driven/core@0.58.2

## 1.4.19

### Patch Changes

- Updated dependencies [588763b]
  - @intent-driven/core@0.58.1

## 1.4.18

### Patch Changes

- Updated dependencies [daf8b94]
  - @intent-driven/core@0.58.0

## 1.4.17

### Patch Changes

- Updated dependencies [85bf78e]
  - @intent-driven/core@0.57.1

## 1.4.16

### Patch Changes

- Updated dependencies [c3b3621]
- Updated dependencies [c3b3621]
- Updated dependencies [c3b3621]
  - @intent-driven/core@0.57.0

## 1.4.15

### Patch Changes

- Updated dependencies [b4b9d1a]
  - @intent-driven/importer-openapi@0.6.0

## 1.4.14

### Patch Changes

- Updated dependencies [ce2ee75]
  - @intent-driven/core@0.56.0

## 1.4.13

### Patch Changes

- Updated dependencies [2bae0d3]
  - @intent-driven/core@0.55.2

## 1.4.12

### Patch Changes

- Updated dependencies [d78680b]
  - @intent-driven/core@0.55.1

## 1.4.11

### Patch Changes

- Updated dependencies [0153d20]
  - @intent-driven/core@0.55.0

## 1.4.10

### Patch Changes

- Updated dependencies [8647f82]
  - @intent-driven/core@0.54.0

## 1.4.9

### Patch Changes

- Updated dependencies [a06e7e6]
  - @intent-driven/core@0.53.0

## 1.4.8

### Patch Changes

- Updated dependencies [1d7cb5c]
  - @intent-driven/core@0.52.1

## 1.4.7

### Patch Changes

- Updated dependencies [5072b5b]
  - @intent-driven/importer-openapi@0.5.0

## 1.4.6

### Patch Changes

- Updated dependencies [aec6c9f]
  - @intent-driven/enricher-claude@0.2.1

## 1.4.5

### Patch Changes

- Updated dependencies [b8ec84c]
  - @intent-driven/importer-openapi@0.4.0

## 1.4.4

### Patch Changes

- Updated dependencies [6b2abac]
  - @intent-driven/core@0.52.0

## 1.4.3

### Patch Changes

- Updated dependencies [be56319]
  - @intent-driven/core@0.51.0

## 1.4.2

### Patch Changes

- Updated dependencies [6e3942a]
- Updated dependencies [6e3942a]
- Updated dependencies [6e3942a]
- Updated dependencies [6e3942a]
  - @intent-driven/core@0.50.0
  - @intent-driven/importer-postgres@0.4.0
  - @intent-driven/importer-prisma@0.4.0

## 1.4.1

### Patch Changes

- Updated dependencies [e24d843]
  - @intent-driven/importer-postgres@0.3.0
  - @intent-driven/importer-openapi@0.3.0
  - @intent-driven/importer-prisma@0.3.0

## 1.4.0

### Minor Changes

- d9ad4c8: `@intent-driven/importer-prisma@0.1.0` — Prisma schema (`.prisma`) → IDF ontology. Парсит через `@mrleebo/prisma-ast`. Мапит scalar types (String/Int/BigInt/Float/Decimal/Boolean/DateTime/Json/Bytes) в IDF field types с role-inference (primary-title / date-witness / contact / money / status-flag). `@id` / `@updatedAt` / `@default(now())` → `readOnly`. `@default("literal")` → IDF default. `@relation(fields: [fk], references: [id])` → `entity.relations[fk] = { entity, kind: "belongs-to" }`. Self-ref и named relations поддерживаются. List-relations (Post[]) игнорируются. Seed CRUD intents (5 на entity).

  `@intent-driven/cli` — subcommand `idf import prisma --file <path> [--out <path>]`.

  Phase E Этапа 3. Проверено на real 5-model e-commerce schema: User/Category/Product/Order/OrderItem с 4 FK relations (включая self-ref Category.parentId).

### Patch Changes

- Updated dependencies [d9ad4c8]
  - @intent-driven/importer-prisma@0.2.0

## 1.3.0

### Minor Changes

- b023e14: `@intent-driven/importer-openapi@0.1.0` — OpenAPI 3.x spec → IDF ontology. Парсит YAML/JSON (через `yaml` пакет), резолвит `$ref` (с cycle-detection), схемы → entities с role-inference (primary-title / date-witness / contact / money / status-flag), paths → intents через REST-conventions (POST → create, PATCH/PUT → update, DELETE → remove, GET list/detail). `operationId` побеждает автогенерируемые имена; path-`{param}` → IDF-`:param`; `required: true` proxied в intent.parameters.

  `@intent-driven/cli` — subcommand `idf import openapi --file <path> [--out <path>]`. Поддерживает `.json` и `.yaml`.

  Проверено на real Swagger Petstore 3.0.4 — 13 entities / 19 intents, все `operationId` уважены.

  Phase D Этапа 3 плана "IDF standalone Retool-alternative" (2026-04-21).

### Patch Changes

- Updated dependencies [b023e14]
  - @intent-driven/importer-openapi@0.2.0

## 1.2.0

### Minor Changes

- 1752951: `@intent-driven/enricher-claude@0.1.0` — AI-обогащение IDF ontology через subprocess к локально установленному `claude` CLI (а не Anthropic SDK). Добавляет namedIntents beyond CRUD (activate/deactivate/approve/cancel), absorbHints (R8 Hub-absorption), additionalRoles (пропущенные семантические роли), baseRoles (admin / observer / agent из column-context). Prompt-cache в `~/.cache/intent-driven/enricher/` (SHA-256, TTL 7 дней). Author-transparent `__witness` на каждом добавленном intent.

  `@intent-driven/cli` — `idf enrich --in <ontology.js> [--out <path>] [--force] [--no-review]` + `--enrich` flag для `idf import postgres`. 26 unit/integration тестов + manual E2E на real claude CLI (4 suggestions распознано на 4-entity e-commerce schema).

  Phase B Этапа 2 плана "IDF standalone Retool-alternative" (2026-04-21).

### Patch Changes

- Updated dependencies [1752951]
  - @intent-driven/enricher-claude@0.2.0

## 1.1.0

### Minor Changes

- a54fb07: `@intent-driven/importer-postgres@0.1.0` — Postgres schema → IDF ontology. Читает `information_schema`, маппит tables/columns в entities/fields с inference семантических ролей (`primary-title`, `money`, `date-witness`, `contact`, `status-flag`). FK → `entity.relations` для R8 Hub-absorption hint'ов. Генерит seed CRUD intents (create/update/remove/list/read) на каждую сущность.

  `@intent-driven/cli` — добавлена subcommand `idf import postgres --url $DATABASE_URL [--out path] [--schema name]`. Часть Phase A Этапа 2 плана "IDF standalone Retool-alternative" (2026-04-21).

  Проверено на Docker Postgres 16-alpine с 5-table e-commerce schema — сгенерирована ontology с 5 entities / 25 intents / 5 FK-relations / 6 inferred semantic-role patterns. 31 unit/integration test зелёный.

### Patch Changes

- Updated dependencies [a54fb07]
  - @intent-driven/importer-postgres@0.2.0

## 1.0.54

### Patch Changes

- Updated dependencies [434de69]
  - @intent-driven/core@0.49.0

## 1.0.53

### Patch Changes

- Updated dependencies [a17e236]
  - @intent-driven/core@0.48.0

## 1.0.52

### Patch Changes

- Updated dependencies [8a43a88]
  - @intent-driven/core@0.47.1

## 1.0.51

### Patch Changes

- Updated dependencies [e5262ec]
  - @intent-driven/core@0.47.0

## 1.0.50

### Patch Changes

- Updated dependencies [d6281b7]
  - @intent-driven/core@0.46.0

## 1.0.49

### Patch Changes

- Updated dependencies [fd4e550]
  - @intent-driven/core@0.45.0

## 1.0.48

### Patch Changes

- Updated dependencies [50b1b8f]
  - @intent-driven/core@0.44.0

## 1.0.47

### Patch Changes

- Updated dependencies [0cf2da8]
  - @intent-driven/core@0.43.0

## 1.0.46

### Patch Changes

- Updated dependencies [b558795]
  - @intent-driven/core@0.42.0

## 1.0.45

### Patch Changes

- Updated dependencies [86ad499]
- Updated dependencies [86ad499]
  - @intent-driven/core@0.41.0

## 1.0.44

### Patch Changes

- Updated dependencies [59715cd]
- Updated dependencies [59715cd]
  - @intent-driven/core@0.40.0

## 1.0.43

### Patch Changes

- Updated dependencies [bb8f26f]
  - @intent-driven/core@0.39.0

## 1.0.42

### Patch Changes

- Updated dependencies [a7e6aef]
  - @intent-driven/core@0.38.0

## 1.0.41

### Patch Changes

- Updated dependencies [893d43f]
  - @intent-driven/core@0.37.0

## 1.0.40

### Patch Changes

- Updated dependencies [3101243]
  - @intent-driven/core@0.36.0

## 1.0.39

### Patch Changes

- Updated dependencies [cfb2d64]
  - @intent-driven/core@0.35.0

## 1.0.38

### Patch Changes

- Updated dependencies [2cabdb7]
  - @intent-driven/core@0.34.0

## 1.0.37

### Patch Changes

- Updated dependencies [fb47875]
  - @intent-driven/core@0.33.1

## 1.0.36

### Patch Changes

- Updated dependencies [4ebff4d]
  - @intent-driven/core@0.33.0

## 1.0.35

### Patch Changes

- Updated dependencies [d288926]
  - @intent-driven/core@0.32.0

## 1.0.34

### Patch Changes

- Updated dependencies [0fb39cb]
  - @intent-driven/core@0.31.2

## 1.0.33

### Patch Changes

- Updated dependencies [9a5388c]
  - @intent-driven/core@0.31.1

## 1.0.32

### Patch Changes

- Updated dependencies [4a2ef3e]
  - @intent-driven/core@0.31.0

## 1.0.31

### Patch Changes

- Updated dependencies [0d9883e]
  - @intent-driven/core@0.30.0

## 1.0.30

### Patch Changes

- Updated dependencies [ac0881a]
  - @intent-driven/core@0.29.0

## 1.0.29

### Patch Changes

- Updated dependencies [75b96ae]
  - @intent-driven/core@0.28.0

## 1.0.28

### Patch Changes

- Updated dependencies [0c866a7]
  - @intent-driven/core@0.27.0

## 1.0.27

### Patch Changes

- Updated dependencies [c8b40cf]
  - @intent-driven/core@0.26.0

## 1.0.26

### Patch Changes

- Updated dependencies [ddc222c]
  - @intent-driven/core@0.25.0

## 1.0.25

### Patch Changes

- Updated dependencies [8f6165b]
  - @intent-driven/core@0.24.0

## 1.0.24

### Patch Changes

- Updated dependencies [2e02b73]
  - @intent-driven/core@0.23.0

## 1.0.23

### Patch Changes

- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
  - @intent-driven/core@0.22.0

## 1.0.22

### Patch Changes

- Updated dependencies [265af59]
  - @intent-driven/core@0.21.0

## 1.0.21

### Patch Changes

- Updated dependencies [db67207]
  - @intent-driven/core@0.20.0

## 1.0.20

### Patch Changes

- Updated dependencies [e736b61]
  - @intent-driven/core@0.19.0

## 1.0.19

### Patch Changes

- Updated dependencies [d01d8de]
  - @intent-driven/core@0.18.0

## 1.0.18

### Patch Changes

- Updated dependencies [5a6429d]
  - @intent-driven/core@0.17.0

## 1.0.17

### Patch Changes

- Updated dependencies [a164717]
  - @intent-driven/core@0.16.0

## 1.0.16

### Patch Changes

- Updated dependencies [519b4b9]
  - @intent-driven/core@0.15.0

## 1.0.15

### Patch Changes

- Updated dependencies [01bc3a3]
  - @intent-driven/core@0.14.0

## 1.0.14

### Patch Changes

- Updated dependencies [2a0bc87]
  - @intent-driven/core@0.13.0

## 1.0.13

### Patch Changes

- Updated dependencies [0d49cdf]
  - @intent-driven/core@0.12.0

## 1.0.12

### Patch Changes

- Updated dependencies [988bfe4]
  - @intent-driven/core@0.11.0

## 1.0.11

### Patch Changes

- Updated dependencies [2827db9]
  - @intent-driven/core@0.10.1

## 1.0.10

### Patch Changes

- Updated dependencies [c413d3d]
  - @intent-driven/core@0.10.0

## 1.0.9

### Patch Changes

- Updated dependencies [9b8f413]
  - @intent-driven/core@0.9.1

## 1.0.8

### Patch Changes

- Updated dependencies [4142c3d]
  - @intent-driven/core@0.9.0

## 1.0.7

### Patch Changes

- Updated dependencies
  - @intent-driven/core@0.8.0

## 1.0.6

### Patch Changes

- Updated dependencies [7f60b09]
  - @intent-driven/core@0.7.2

## 1.0.5

### Patch Changes

- Updated dependencies [6f09f57]
  - @intent-driven/core@0.7.1

## 1.0.4

### Patch Changes

- Updated dependencies [b6a62e7]
  - @intent-driven/core@0.7.0

## 1.0.3

### Patch Changes

- Updated dependencies [daadd3d]
  - @intent-driven/core@0.6.0

## 1.0.2

### Patch Changes

- 550d9c2: feat(cli): validate.js ловит AnchoringError и печатает findings

  Если `crystallizeV2` в strict-режиме throw'ит `AnchoringError`, CLI теперь
  печатает каждый structural miss с actionable-подсказкой в stderr, затем
  re-throw. Это даёт автору сгенерированного домена чёткую диагностику: какой
  intent, какая частица, как исправить.

- Updated dependencies [550d9c2]
  - @intent-driven/core@0.5.1

## 1.0.1

### Patch Changes

- Updated dependencies [8b2c20e]
  - @intent-driven/core@0.5.0

## 1.0.0

### Major Changes

- e9432de: Первый публичный релиз `@intent-driven/cli@0.1.0` — CLI для bootstrap новых доменов IDF через интерактивный LLM-диалог.

  Команда `idf init <name>` ведёт 5-шаговый диалог с Claude (haiku/sonnet/opus на выбор):

  1. Описание домена (1-2 предложения от автора).
  2. Сущности — Claude предлагает 3-7 entity на основе описания.
  3. Роли с base (owner/viewer/agent/observer).
  4. Намерения — Claude выводит 8-15 атомарных интентов; multiselect.
  5. Генерация файлов + self-validation через `crystallizeV2`.

  Артефакт — каталог `<name>/` с `domain.js` (ontology + intents + projections как map'ы), `seed.js` (стартовый мир), `test/crystallize.test.js`, `package.json`, `README.md`. После `cd <name> && npm install && npm test` — всё зеленеет.

  System prompt с компактной IDF-spec кешируется через Anthropic prompt caching (>90% скидка на повторные шаги).

  Скоп v0.1: только команда `init`. Планы на v0.2 — `add intent`, `validate <path>` через conformance-тесты.

  Тесты: 20/20 (templates + e2e с реальным `crystallizeV2` без сети).
