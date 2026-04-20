---
"@intent-driven/core": minor
---

feat(materializers): `materializeAuditLog(phi, filter)` + `buildAuditContext(...)`.

`materializeAuditLog` — чистая функция над `Φ = { effects }`, фильтрует confirmed effects по actor / timeRange / intentTypes / entityKind / entityId / ruleId и обогащает полями из `effect.context.__audit`. Основа audit-view для observer-role.

`buildAuditContext({intent, actor, timestamp, ruleIds?, evidenceIds?, witnessChain?})` — helper для host-валидатора: строит канонический блок `__audit` с fnv1a-hash над canonical-json всего контента (стабильный cross-reference identifier, не криптоподпись).

Use-case: 13-й полевой тест compliance-домен (SOX ICFR). Audit trail как derived view над Φ (не отдельная материализованная сущность), reader-equivalence с document/voice materializer'ами.
