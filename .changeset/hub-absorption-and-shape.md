---
"@intent-driven/core": minor
---

Hub-absorption (R8) + shape-layer в crystallize_v2 — снимает монотонность «много flat tabs × hero-create везде» в CRUD-доменах.

**R8 Hub-absorption** (`absorbHubChildren`): child-каталоги с FK на entity с detail-проекцией автоматически помечаются `absorbedBy: "<parent>_detail"` и добавляются в `hubSections: [{ projectionId, foreignKey, entity }]` на hub-detail. Threshold — ≥2 child-каталога (меньше не оправдывает иерархии). Author-override: `projection.absorbed: false`.

**Shape-layer** (`deriveShape`): вывод визуального shape'а для catalog/feed поверх archetype:
- `timeline` — date-witness + descending sort (хронологии вроде health_feed).
- `directory` — contact-поля (phone/email/address) без date-sort (адресные книги).
- `default` — fallback.

Author-override: `projection.shape`. Результат в `artifact.shape` + `artifact.shapeSignals`, shape !== default также пишется в `slots.body.shape` для renderer.

**Hero-create guard**: для `timeline` и `directory` creator не идёт в hero-слот, а в toolbar — хронологии и контакты не должны визуально доминировать над созданием.

**Новые поля artifact**: `absorbedBy`, `hubSections`, `shape`, `shapeSignals`. Также `slots.hubSections` в detail-архетипе (hook для будущего rendering v0.2).
