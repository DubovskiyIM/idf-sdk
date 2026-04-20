---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

Promote rating-aggregate-hero candidate → stable с полной реализацией.

**core:** новый stable pattern (detail archetype) с `structure.apply` — enriches
`slots.header` node `{type:"ratingAggregate", subEntity, fkField, ratingField,
countLabel}`. Trigger: detail-проекция с sub-entity имеющим поле fieldRole:"rating"
либо name-hint (rating/score/stars/grade). Убран из curated candidate bank.

**renderer:** новый primitive `RatingAggregate` — runtime compute: фильтр
`world[pluralized(subEntity)]` по FK, avg/count по ratingField. Rendering:
"⭐ 4.9 · 128 отзывов" с корректной русской деклинацией. Зарегистрирован
в `PRIMITIVES.ratingAggregate`.
