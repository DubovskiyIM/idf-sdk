---
"@intent-driven/core": minor
---

Pattern Bank: curated-кандидаты — 8 researcher-паттернов из profi+avito field
research (2026-04-17-18), прошедшие human review и строгий `validatePattern`
(включая `falsification.shouldMatch`/`shouldNotMatch`). Matching-ready, без
`structure.apply`.

Новые файлы в `packages/core/src/patterns/candidate/{catalog,detail,feed}/`:
category-tree-with-counter + paid-promotion-slot (merged profi+avito),
map-filter-catalog, reputation-level-badge, rating-aggregate-hero,
review-criterion-breakdown, direct-invite-sidebar, response-cost-before-action.

Экспорт `CURATED_CANDIDATES` (отдельно от manifest-свалки 127+). Общий
`CANDIDATE_PATTERNS` теперь union: сначала curated (строгая схема),
потом manifest (schema-lax). `loadCandidatePatterns` регистрирует обоих,
first-wins при коллизии id. Default registry по-прежнему stable-only —
candidate остаются explicit opt-in.

Promotion в stable + `structure.apply` — отдельный sub-project.
