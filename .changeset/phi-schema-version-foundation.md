---
"@intent-driven/core": minor
---

feat(core): Φ schema-versioning Phase 0 foundation

Добавлены pure-helper'ы под design-spec `idf/docs/design/2026-04-26-phi-schema-versioning-spec.md` (backlog §2.8).

**Новый API:**

- `UNKNOWN_SCHEMA_VERSION` — sentinel для legacy effects (`"unknown"`).
- `getSchemaVersion(effect)` — читает `effect.context.schemaVersion`, fallback'ит на sentinel. Никогда не throw.
- `tagWithSchemaVersion(effect, version)` — pure, возвращает копию эффекта с проставленным `context.schemaVersion`. Не мутирует input.
- `hashOntology(ontology)` — детерминированный 14-char hex хэш канонизированной онтологии. Order-independent для object keys, order-sensitive для массивов. Cross-stack reproducible (cyrb53 spec в JSDoc).

**Zero behavior change.** `fold()` пока не использует schemaVersion — это фундамент под Phase 1 (server tagging на confirm) и Phase 3 (upcasters). Backward compat: legacy effect без поля → `UNKNOWN_SCHEMA_VERSION` → текущее поведение `fold(Φ)`.

23 unit tests, 1968 total green.
