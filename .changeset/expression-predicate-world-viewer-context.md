---
"@intent-driven/core": minor
---

feat(invariants): `expression`-kind передаёт predicate не только `row`, но и `world` / `viewer` / `context`.

Backward-compat: существующие predicate-функции с single-arg `(row) => ...` продолжают работать (JS игнорирует лишние аргументы). Новые cross-entity сценарии — как `(row, world) => world.entities.find(...)` — теперь выражаются декларативно без выхода в domain-effects.

Expression-строки также получают `world`, `viewer`, `context` как явные имена наряду с `with (row)` (поля row — bare identifiers, back-compat).

Use-case: 13-й полевой тест compliance-домен (SOX ICFR) — invariants типа «CFO не подписывает cycle, содержащий собственный JE» и «threshold-approvals dynamic по amount» теперь выражаются одним expression-инвариантом вместо ручного enforce'а в buildEffects.
