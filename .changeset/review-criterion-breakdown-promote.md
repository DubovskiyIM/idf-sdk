---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

Promote review-criterion-breakdown candidate → stable с полной реализацией.

**core:** новый stable pattern (detail archetype) с `structure.apply` — prepend'ит
в `slots.sections` section `{type: "criterionSummary", subEntity, fkField, criteria,
title}`. Trigger: detail-проекция с sub-entity имеющим ≥3 criterion-полей
(*_rating / *_score суффикс, whitelist quality/punctuality/..., или
fieldRole:"rating"). Убран из curated candidate bank.

**renderer:** новый primitive `CriterionSummary` — runtime compute avg по каждому
criterion'у из `world[pluralized(subEntity)]`. Horizontal bar-chart с auto-scale
(5 vs 10). Зарегистрирован в `PRIMITIVES.criterionSummary`.
