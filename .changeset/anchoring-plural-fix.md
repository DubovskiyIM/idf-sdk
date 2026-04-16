---
"@intent-driven/core": patch
---

fix(anchoring): корректная plural-резолюция как в buildTypeMap

Наивный `endsWith("s") ? slice(0,-1) : name` давал ложные error'ы для
"activities" → "activitie", "addresses" → "addresse", "deliveries" → "deliverie".
Теперь `checkAnchoring` использует тот же алгоритм, что `buildTypeMap` в fold.js:
y → ies, s → ses, иначе + s. Построен collection-lookup: каждая entity
регистрируется и под singular-именем, и под своей plural-формой.

Найдено аудитом прототипа (sales, reflect, delivery, invest, messenger) — 80%
из 134 "errors" были артефактом баги, не реальными ontology gaps.
