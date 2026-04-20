---
"@intent-driven/core": minor
---

feat(core): R7b — multi-ownerField disjunction catalog rule

Расширение R7: `entity.ownerField` может быть **массивом** (2+ элементов) →
генерируется `my_<entity>_list` с disjunction-фильтром (OR).

```js
ontology.entities.Deal = {
  ownerField: ["customerId", "executorId"],  // multi-owner
  fields: { customerId: {...}, executorId: {...} },
};
```

→ derived `my_deal_list` с:

```js
{
  kind: "catalog",
  mainEntity: "Deal",
  filter: {
    kind: "disjunction",
    fields: ["customerId", "executorId"],
    op: "=",
    value: "me.id",
  },
  derivedBy: [witnessR7bMultiOwnerFilter(...)],
}
```

**Mutual exclusion**: R7 (single owner) и R7b (multi-owner) взаимоисключающи
на одной entity. Array с `length === 1` **не** триггерит R7b (требование ≥2);
такая проекция вообще не генерируется — автор должен либо указать string
(R7), либо добавить второй owner (R7b).

Motivation: backlog 3.2 в freelance (Deal имеет customerId + executorId —
обе — legitimate ownership relations). Authored `my_deals` с filter
`"customerId === me.id OR executorId === me.id"` можно теперь вывести
через R7b.

Спецификация: `idf-manifest-v2.1/docs/design/rule-R7b-multi-owner-spec.md`
(draft); основная мотивация — `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`
(Baseline 2026-04-20, R-rule candidates).

**Backward compat**: `ownerField: "x"` (string) продолжает работать через
R7 без изменений. Array-form — opt-in новая capability.

Тесты: +3 в witnesses.test.js (R7b multi-owner, array-length-1 не-триггер,
3+ ownerFields). 833/833 зелёные.

Renderer-стороны: `filter.kind === "disjunction"` — новый формат для
catalog'а, который `List` primitive должен уметь фильтровать. В этом PR
не затронут; separate follow-up на renderer-пакет.
