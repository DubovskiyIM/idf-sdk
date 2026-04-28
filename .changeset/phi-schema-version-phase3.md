---
"@intent-driven/core": minor
---

feat(core): Φ schema-versioning Phase 3 — applyUpcaster + fold(upcast(Φ))

Полная имплементация upcast-pipeline под design-spec §4.3-§4.4. Декларативные шаги (4 kinds) + functional escape hatch + path resolution через evolution log + foldWithUpcast wrapper.

**Новый публичный API в `@intent-driven/core`:**

| Export | Что |
|---|---|
| `applyRename` | rename: `{entity, from, to}` — переименование поля в context + target rewrite |
| `applySplitDiscriminator` | splitDiscriminator: `{from, field, mapping}` — переезд эффекта в новую сущность по дискриминатору, lineage `__derivedFrom` |
| `applySetDefault` | setDefault: `{entity, field, value}` — заполнение missing полей (только для α=add) |
| `applyEnumMap` | enumMap: `{entity, field, mapping}` — old→new enum value mapping |
| `applyDeclarativeUpcaster` | композиция всех 4 шагов в фиксированном порядке |
| `applyUpcaster` | declarative + functional fn (escape hatch) |
| `pathFromTo(fromHash, toHash, ontology)` | chain upcaster'ов через evolution log |
| `upcastEffect(effect, targetHash, ontology, world)` | apply chain к одному эффекту, поддерживает split (Effect[]) и drop (null) |
| `upcastEffects(effects, ontology, opts)` | batch-версия, default targetHash = current |
| `foldWithUpcast(effects, ontology, opts)` | wrapper над `fold` с автоматическим upcast |

**Фиксированный порядок declarative шагов** (cross-stack нормативный):

1. `rename` — канонизируем имена полей
2. `splitDiscriminator` — переезд в новую сущность
3. `setDefault` — заполняем missing (только α=add)
4. `enumMap` — переводим old→new значения

**Функциональные upcasters (`fn`)** — escape hatch для split на N effects, drop эффекта (null), сложных трансформаций. **Жёсткий запрет:** runtime-LLM в fn — design-time JS код, написанный человеком (опц. сгенерированный LLM, но зафиксированный в репо). Иначе смерть детерминизма формата (spec §1).

**Семантика `foldWithUpcast`:**

```
world = fold(upcast(Φ_confirmed, currentSchema))
```

- Без evolution log — поведение совпадает с обычным `fold`.
- targetHash по умолчанию = `getCurrentVersionHash(ontology)`; можно переопределить (e.g. для time-travel reads).
- Legacy эффекты с `UNKNOWN_SCHEMA_VERSION` проходят полную цепочку upcast'ов от root до target.
- fn-throw → safe fallback на declarative result + console.warn (Phase 5 Layer 4 detector поймает дисперсию).

**Backward compat.** Онтологии без `evolution[]` работают как раньше — `foldWithUpcast` делегирует обычному `fold`. Никаких изменений в `fold` semantics.

46 новых unit-тестов в `upcasters.test.js`. Полный core suite **2052/2052** green.
