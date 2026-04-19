---
"@intent-driven/core": minor
---

feat(core): R10 — role-scope filtered catalog rule

Новое правило деривации: для каждой роли с `role.scope[entityName]` в онтологии,
генерируется scoped read-only catalog с structured m2m-via filter.

Поддерживает формат `role.scope` v1.6 (реальный в invest):

```js
ontology.roles.advisor = {
  scope: {
    User: {
      via: "assignments",
      viewerField: "advisorId",
      joinField: "clientId",
      localField: "id",
      statusField: "status",       // опционально
      statusAllowed: ["active"],    // опционально
    },
  },
};
```

Output: `advisor_user_list` с `kind:"catalog"`, `readonly:true`, `filter:{ kind:"m2m-via", via, viewerField, joinField, localField, statusField, statusAllowed }`.

Witness `basis:"crystallize-rule"`, `ruleId:"R10"` несёт role, entity и full scope spec для audit trail.

Incomplete scope-spec'и (отсутствие via/viewerField/joinField/localField) игнорируются. Роли без scope — не триггерят.

Спецификация: `idf-manifest-v2.1/docs/design/rule-R10-role-scope-spec.md`.

**Baseline impact** (stacked on R1b):
- До R10: U = 23 (20%)
- После R10: U = 22 (19%)
- **Δ = -1** (invest.advisor_clients ← advisor_user_list)

Spec предсказывал -6–7. Расхождение — domain authoring gap: messenger/delivery/sales не объявляют `role.scope`, пишут filter-строки вручную в PROJECTIONS. Ontology authoring workstream — отдельно.

Тесты: +4 (m2m-via positive, multi-entity scope, incomplete-spec negative, no-scope negative). 645/645 зелёные.
