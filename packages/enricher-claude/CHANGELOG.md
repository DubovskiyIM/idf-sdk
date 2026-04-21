# @intent-driven/enricher-claude

## 0.2.0

### Minor Changes

- 1752951: `@intent-driven/enricher-claude@0.1.0` — AI-обогащение IDF ontology через subprocess к локально установленному `claude` CLI (а не Anthropic SDK). Добавляет namedIntents beyond CRUD (activate/deactivate/approve/cancel), absorbHints (R8 Hub-absorption), additionalRoles (пропущенные семантические роли), baseRoles (admin / observer / agent из column-context). Prompt-cache в `~/.cache/intent-driven/enricher/` (SHA-256, TTL 7 дней). Author-transparent `__witness` на каждом добавленном intent.

  `@intent-driven/cli` — `idf enrich --in <ontology.js> [--out <path>] [--force] [--no-review]` + `--enrich` flag для `idf import postgres`. 26 unit/integration тестов + manual E2E на real claude CLI (4 suggestions распознано на 4-entity e-commerce schema).

  Phase B Этапа 2 плана "IDF standalone Retool-alternative" (2026-04-21).
