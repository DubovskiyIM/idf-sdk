---
"@intent-driven/engine": minor
---

feat(engine): Φ schema-versioning Phase 1 — tagging при confirm/reject

Engine validator теперь проставляет `effect.context.schemaVersion = hashOntology(ontology)` на каждом submit'е перед `persistence.appendEffect`. Тег попадает в Φ как для confirmed, так и для rejected эффектов — audit trail запоминает онтологию на момент записи.

**Изменения в API:**

- `createEngine(...)` возвращает дополнительное поле `schemaVersion: string` — хэш онтологии, зафиксированный при init.
- `createValidator(...)` тоже экспонирует `schemaVersion` в возвращаемом объекте.
- `peerDependencies['@intent-driven/core']` поднят до `>= 0.107.0` (содержит `hashOntology` / `tagWithSchemaVersion`).

**Особенности реализации:**

- `context: string` (host-стиль PG JSONB) обрабатывается через parse → tag → re-stringify.
- `α === "batch"` — теги проставляются и parent'у, и всем sub-эффектам в `value[]` (они confirmed под той же онтологией).
- Чисто — `applySchemaVersionTag` не мутирует input.
- Невалидный JSON в string-context → fallback `_schemaVersion` в effect-shell (edge case, не должен случаться в нормальном flow).

Backward compat: legacy эффекты в Φ без `context.schemaVersion` читаются через `getSchemaVersion()` → `UNKNOWN_SCHEMA_VERSION`. Phase 3 (`fold(upcast(Φ))`) воспримет `unknown` как «применять текущую онтологию без upcast» (текущее поведение).

10 новых тестов в `validator.schemaVersion.test.js`, полный engine-suite 110/110 green.
