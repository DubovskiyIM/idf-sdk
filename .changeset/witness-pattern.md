---
"@intent-driven/core": minor
---

feat: witness.pattern — formal grouping key для heuristic findings (§15 v1.10 zazor #3 phase 1)

- `witness.pattern: string` добавлен в finding/evidence shape (additive, optional).
- `inferFieldRole` эмитит pattern для всех 12 heuristic branches: `name:title-synonym`, `name:description-synonym`, `name:price-substring`, `name:timer-suffix`, `name:coordinate-set`, `name:address-suffix`, `name:zone-set`, `name:location-set`, `name:badge-status`, `type:number-metric-fallback`, `fallback:info`.
- `computeAlgebraWithEvidence` эмитит `pattern: "antagonist-declared"` для heuristic-lifecycle entries.
- Structural / rule-based findings: pattern optional (не требуется — они уже named через свой тип).

**Convention:** `reliability: "heuristic"` → `witness.pattern` обязано быть заполнено. Linter-enforcement — open task v1.11+.

Prerequisite infrastructure для zazor #3 phase 2 (promotion writer): analyzer группирует heuristic occurrences по formal pattern без string-parsing basis'ов.
