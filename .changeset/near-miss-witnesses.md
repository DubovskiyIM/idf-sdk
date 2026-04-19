---
"@intent-driven/core": minor
---

feat(core): near-miss witnesses — актionable rationale для не-сработавших правил

Новая функция `collectNearMissWitnesses(intents, ontology)` возвращает массив
«отрицательных» witness'ов: где R-правило могло бы сработать, но не сработало,
и что автор может сделать чтобы запустить.

Basis: `"crystallize-rule-near-miss"` (новый, отличается от positive
`"crystallize-rule"`).

**Покрываемые правила**:

- **R3**: entity с ровно 1 mutator (threshold = >1 для detail). Rationale:
  «|mutators(Category)| = 1; R3 требует >1». Suggestion: «Добавьте второй
  mutator или объявите category_detail явно».
- **R1b**: изолированная entity (creators=0, не kind:reference, не referenced
  по FK). Suggestion: пометить `kind:"reference"` или удалить из ontology.
- **R7**: entity с creators и owner-candidate полем (userId/ownerId/authorId/
  creatorId), но без `ownerField` declaration. Suggestion: объявить
  `ontology.entities.E.ownerField = "userId"`.
- **R10**: agent/observer роль без scope declaration. Suggestion: добавить
  `role.scope = { Entity: { via, viewerField, joinField, localField } }`.

**Исключения**: `entity.kind: "assignment"` не триггерит R1b/R3/R7;
owner/viewer base-роли без scope — не триггерят R10.

Также экспортируется `groupNearMissByRule(nms)` — группировка по ruleId для
render'а.

**Consumer**: CrystallizeInspector (§27 Studio), uncovered-classification.mjs,
explainCrystallize extensions.

Спецификация: `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`
(секция «Witness'ы для не-сработавших правил»).

Тесты: +16 в nearMissWitnesses.test.js (R3/R1b/R7/R10 positive + negatives,
assignment-exclusion, group, edge cases). 689/689 зелёные.
