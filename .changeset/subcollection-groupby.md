---
"@intent-driven/renderer": minor
---

`SubCollectionSection` поддерживает `section.groupBy` для polymorphic junctions (PR #232).

Если задано, items группируются по значению field, рендерятся bucket'ами: subheader «Label (count)» + items внутри. Null/пустые значения — отдельный bucket с `groupNullLabel` (дефолт «Без значения»). Порядок групп — стабильный по первому встреченному значению после `applySort`.

Pattern `reverse-association-browser` уже выставляет `groupBy` на discriminator-поле polymorphic junction (`objectType` / `entityType` / `kind`) — теперь Gravitino Tag.detail рендерится сгруппированным: Catalog (3) / Schema (12) / Table (45), а не flat-списком. Без `groupBy` поведение не меняется (back-compat).
