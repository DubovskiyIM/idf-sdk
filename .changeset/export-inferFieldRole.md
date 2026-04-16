---
"@intent-driven/core": patch
---

feat: публичный экспорт `inferFieldRole` для внешних консументов (zazor #3 analyzer)

`inferFieldRole` ранее был доступен только через internal `crystallize_v2/ontologyHelpers.js`. Нужен для batch analyzer (`scripts/zazor3-candidates.mjs` в прототипе), который группирует heuristic findings по `witness.pattern`. Additive, не breaking.
