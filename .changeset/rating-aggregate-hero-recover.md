---
"@intent-driven/core": patch
"@intent-driven/renderer": patch
---

Recover rating-aggregate-hero promotion — файлы потерянные squash-merge PR #119
(base=feat/pattern-candidate-migration, уже merged в main → GitHub вычислил
diff пустым, в main попал только changeset `rating-aggregate-hero-promote.md`).

**core:** `stable/detail/rating-aggregate-hero.js` с `structure.apply` — prepend'ит
в `slots.header` node `{type: "ratingAggregate", subEntity, fkField, ratingField,
countLabel}`. Detect: detail с sub-entity `fieldRole:"rating"` или name-hint
(`rating`/`score`/`stars`/`grade`, type number).

**renderer:** `primitives/RatingAggregate.jsx` — runtime compute avg+count из
`ctx.world[pluralized(subEntity)]` с фильтром по FK. Rendering "⭐ 4.9 · 128
отзывов" с русской деклинацией. Зарегистрирован в `PRIMITIVES.ratingAggregate`.
