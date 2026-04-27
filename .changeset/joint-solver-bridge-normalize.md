---
"@intent-driven/core": minor
---

fix(core): computeAlternateAssignment — нормализовать INTENTS перед accessibleIntents (A2 Phase 3 closure)

Bridge `computeAlternateAssignment` принимает raw INTENTS из caller, но
`accessibleIntents` читает `particles.entities` / `particles.effects`.
Object-format intents (notion, gravitino, automation использует top-level
α/target вместо `particles.effects`) — particles.entities появляется
только после normalize.

В результате до fix bridge не видел 30 intents в этих доменах
(notion 21, gravitino 8, automation 1) — они флагились как author-bug
`missing-entity-reference`.

Fix: `normalizeIntentsMap(INTENTS)` перед `accessibleIntents` в bridge.
crystallize_v2 нормализует на входе; bridge — caller-direct entry —
должен делать то же. Idempotent: уже-normalized passes как no-op.

Validation после fix (idf re-run на 17 доменах):
  derivedOnly: 49 → 0 (-100%, все 49 cases закрыты)
  Total intents: 859 → 1142 (alternate теперь видит правильно
                              normalized intents)
  Agreement: 14.3% → 11.5% (lower из-за wider total; в abs terms
                            agreed 123 → 131)

Companion: idf PR — author fixes для sales/messenger где raw intents
имели explicit `entities: []` (16+3=19 cases).

A2 Phase 3 calibration journey final state:
  Phase 3a: 5.9% agreement, 873 derivedOnly
  Phase 3f: 14.3%, 49 derivedOnly (canExec leak closed)
  Final:    11.5%, 0 derivedOnly (all author bugs closed)

  derivedOnly direction CLOSED.
  Alternate-only direction (530 cases) — новый research axis.

Tests: 1887/1887 core regression green.
