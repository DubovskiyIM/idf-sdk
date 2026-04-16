---
"@intent-driven/core": minor
---

feat: witness-of-proof filling (§15 zazor #2)

- `checkAnchoring` заполняет `reliability` (structural / rule-based / heuristic) и `witness.basis` для всех findings (entity / effect.target / field / witness / condition).
- `computeAlgebraWithEvidence` добавляет `reliability` alias над существующим `classification` + `witness.basis`.
- `inferFieldRole` теперь возвращает `{role, reliability, basis}` вместо `string` (internal breaking — 4 call sites в crystallize_v2 мигрированы в этом же релизе). External consumers: обновить `const r = inferFieldRole(...)` → `const r = inferFieldRole(...)?.role`.

Reliability taxonomy:
- `structural` — прямая decidable привязка или exhaustive exhaustion для MISS.
- `rule-based` — через объявленное правило (computePlural, type-based, ontology.invariants).
- `heuristic` — name-convention без формального правила.

Runtime `effect.context.__witness` convention вводится в потребляющих репозиториях (scheduler / Rules Engine / invariant checker) — не часть SDK. Поле `witness.counterexample` остаётся зарезервированным (v1.10+).

**Reliability расширяет capability surface family** (§26 v1.6 #2 insight): `entity.kind` / `role.scope` / `adapter.capabilities` / `reliability` — четвёртый член. Эпистемическая capability, complementary к структурным. Prerequisite infrastructure для zazor #3 (heuristic-once → implication rule).
