---
"@intent-driven/core": minor
---

feat: binary anchoring gate (§15 zazor #1) — Phase 1

- Добавлены `checkAnchoring(INTENTS, ONTOLOGY)` и `AnchoringError`.
- `crystallizeV2` принимает `opts.anchoring: "strict" | "soft"`. Default — `"soft"` в этом релизе (не breaking).
- `ontology.systemCollections: string[]` — декларация коллекций без доменной сущности (`drafts`, `users`, `scheduledTimers`) для подавления anchoring errors.
- `checkIntegrity` rule #6 делегирует `checkAnchoring`, back-compat сохранён.
- Классификация частиц: конструктивные (entity, effect.target base) → error; описательные (field, witness, condition) → warning/info.

Phase 3 (следующий major) переключит default на `strict` — все потребители получат явную миграционную заметку.
