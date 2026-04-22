# @intent-driven/enricher-claude

## 0.2.1

### Patch Changes

- aec6c9f: Поддержать новый wire-format Claude CLI 2.1.x: `wrapper.structured_output` имеет приоритет над `wrapper.result`.

  До этого fix'а `subprocess.js` читал только `wrapper.result ?? wrapper.content ?? stdout`. В Claude CLI 2.1.117 при `--json-schema` structured-ответ перемещён в `wrapper.structured_output` как уже-parsed object, а `result` становится пустой строкой. Enricher падал с `Structured response не JSON: ` на любом нетривиальном spec'е.

  Fix: сначала проверяем `structured_output` (возвращаем как есть — это object), fallback на legacy `result`-строку. Backward-compat сохранён: старый CLI-формат продолжает работать.

  Обнаружено в Gravitino dogfood-спринте 2026-04-22 (см. `idf/docs/backlog.md` §1.12).

  Tests: +3 unit — structured_output happy-path, legacy-format fallback, non-object structured_output edge-case.

## 0.2.0

### Minor Changes

- 1752951: `@intent-driven/enricher-claude@0.1.0` — AI-обогащение IDF ontology через subprocess к локально установленному `claude` CLI (а не Anthropic SDK). Добавляет namedIntents beyond CRUD (activate/deactivate/approve/cancel), absorbHints (R8 Hub-absorption), additionalRoles (пропущенные семантические роли), baseRoles (admin / observer / agent из column-context). Prompt-cache в `~/.cache/intent-driven/enricher/` (SHA-256, TTL 7 дней). Author-transparent `__witness` на каждом добавленном intent.

  `@intent-driven/cli` — `idf enrich --in <ontology.js> [--out <path>] [--force] [--no-review]` + `--enrich` flag для `idf import postgres`. 26 unit/integration тестов + manual E2E на real claude CLI (4 suggestions распознано на 4-entity e-commerce schema).

  Phase B Этапа 2 плана "IDF standalone Retool-alternative" (2026-04-21).
