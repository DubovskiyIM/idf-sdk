---
"@intent-driven/core": minor
---

feat(core): witness-of-crystallization для R1–R8 в artifact.witnesses

Каждое срабатывание правил деривации (R1 catalog, R2 feed override, R3 detail, R4 subCollection, R6 field-union, R7 ownerField, R8 hub absorption — parent и child side) оставляет запись в `artifact.witnesses[]` с `basis: "crystallize-rule"`, полями `ruleId`, `input`, `output`, `rationale`.

Назначение: debugging derived UI — второй автор видит observable trail того, какое правило и на каком входе породило проекцию/обогащение. Вместе с существующими `pattern-bank` и `alphabetical-fallback` witnesses даёт полный derivation-граф для Studio Inspector и spec-debt метрик.

Спецификация: `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`.

**API additions** (аддитивно, zero-breaking):
- `proj.derivedBy: CrystallizeWitness[]` — внутренний канал между `deriveProjections` и `crystallizeV2`; пробрасывается в `artifact.witnesses` первыми (origin-witnesses идут до pattern-bank).
- Новый модуль `crystallize_v2/derivationWitnesses.js` — чистые builder-функции per правило.

**Тесты**: +13 в `witnesses.test.js` (формат каждого witness'а + negative cases + integration через crystallizeV2 + hub через absorbHubChildren). 630/630 зелёные, functoriality probe без регрессий.
