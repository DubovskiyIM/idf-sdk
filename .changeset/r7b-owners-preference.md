---
"@intent-driven/core": patch
---

fix(deriveProjections): R7/R7b/R3b читает `entityDef.owners` с fallback к `ownerField`.

`getOwnerFields` (в `ownershipConditionFor`) уже читал `owners` как новый API для multi-owner (backlog §3.2). Но `deriveProjections` (R7, R7b, R3b) читал только `ownerField`. Авторы онтологии, объявляющие `owners: ["customerId", "executorId"]` для `ownershipConditionFor` + `intent.permittedFor`, были вынуждены дублировать поле в `ownerField: [array]` чтобы R7b не отваливался.

После фикса preference к `owners` (с fallback к `ownerField`) обеспечивает одну декларацию multi-owner на обе поверхности:

```js
Deal: {
  owners: ["customerId", "executorId"],  // достаточно
  // ownerField больше не требуется
}
```

Обнаружено при работе с freelance-доменом (12-й полевой тест), multi-owner Deal + `intent.permittedFor` на phase-transitions.
