---
"@intent-driven/core": minor
---

feat: incremental fold + structural snapshots (A1)

Добавляет API для кэширования fold:

- `createSnapshot(effects, typeMap?) → Snapshot` — `world_k` плюс метаданные
  `{ count, lastEffectId, lastCreatedAt, typeMap }`.
- `foldFromSnapshot(snapshot, deltaEffects, typeMap?) → World` — apply
  дельты на `snapshot.world`. Не мутирует snapshot. Семантика:
  `foldFromSnapshot(createSnapshot(prefix), delta) ≡ fold(prefix.concat(delta))`.
- `fold(effects, typeMap, { snapshot })` — третий arg для incremental
  режима. Backward-compat сохранён: `fold(effects)` и `fold(effects, typeMap)`
  без изменений.
- `applyEffect`, `getCollectionType` — извлечены из inline тела `fold` как
  переиспользуемые helpers.

Алгебраическая гарантия (моноид: identity = `{}`, composition = sequential
apply): property test через fast-check, 4 свойства × 100 runs покрывают
add-only, add+replace, add+remove, snapshot immutability при многократных
вызовах.

Бенчмарк (10K Φ, split 9K+1K): foldFromSnapshot 4× быстрее full fold
(0.47 ms vs 1.87 ms на host machine).

Backlog: `docs/superpowers/specs/2026-04-26-core-backlog.md` § A1.
Plan: `docs/superpowers/plans/2026-04-26-incremental-fold-snapshots.md`.

Phase 2 (engine `validator.foldWorld` caching, scoped fold per role) —
отдельный backlog item.
