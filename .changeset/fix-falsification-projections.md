---
"@intent-driven/core": patch
---

fix(patterns): корректные projection names в falsification для 7 golden patterns

В v0.10.0 `shouldMatch` / `shouldNotMatch` для 7 новых golden-паттернов
ссылались на projection names, которых нет в реальных IDF-доменах
(`listings_catalog` vs `listing_feed`, `habits_root` vs `habit_list`,
`workflow_runs` vs `execution_log` и т.д.). После прогона
`matchPatterns()` на всех 9 доменах через `scripts/match-golden-
patterns.mjs` в idf repo (2026-04-18) исправил:

- `global-command-palette`: sales/listing_feed, messenger/conversation_list, booking/review_form
- `optimistic-replace-with-undo`: lifequest/habit_list, lifequest/dashboard, planning/poll_overview
- `bulk-action-toolbar`: переоптимизирован — только messenger/conversation_list (единственный домен с фактическими bulk_*-intents)
- `kanban-phase-column-board`: workflow/execution_log, sales/listing_feed, delivery/orders_feed
- `keyboard-property-popover`: sales/listing_detail, lifequest/goal_detail, lifequest/habit_detail
- `observer-readonly-escape`: упрощён — aspirational shouldMatch на invest/alert_detail, явно задокументирован
- `lifecycle-locked-parameters`: booking/booking_detail, delivery/order_detail, sales/listing_detail

Фактические результаты matching на 9 доменах (после фикса):
- `global-command-palette`: 106 hits
- `optimistic-replace-with-undo`: 67 hits
- `kanban-phase-column-board`: 21 hits
- `bulk-action-toolbar`: 15 hits
- `keyboard-property-popover`: 11 hits
- `lifecycle-locked-parameters`: 8 hits
- `observer-readonly-escape`: 0 hits (aspirational — нужно добавить observer-role с high-irreversibility intents)

Содержимое patterns (trigger / structure / rationale) не менялось — только
falsification section, что исправляет schema-тест без изменения поведения.
