---
"@intent-driven/core": minor
---

normalizeIntentNative compiles `intent.precondition` (author-friendly object-shape) в `particles.conditions` (canonical string-form). Закрывает gap между тем как Claude/PM пишут спеку и чем оперирует SDK — buildItemConditions, evalIntentCondition.

Формат: `{ "Entity.field": "val" | ["v1"] | ["v1","v2"] | true | false | number | null }` → `"Entity.field = 'val'"` / `"Entity.field IN ('v1','v2')"`. Невалидные LHS (без точки) — skip.

Мерджится с existing `particles.conditions`, deduplicates.
