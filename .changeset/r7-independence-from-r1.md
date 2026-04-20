---
"@intent-driven/core": minor
---

feat(core): R7/R7b independence from R1 — fallback на R3 detail

Ослаблен precondition для R7 (owner-filtered catalog) и R7b (multi-owner
disjunction): `my_<entity>_list` теперь генерируется когда существует
**любой** base — R1 catalog **или** R3 detail (раньше требовался catalog).

**Мотивация**: side-effect-created entities (Deal через accept_response,
Assignment через invite_accepted, Order через checkout и т.д.) имеют
mutators (edit/close/cancel) но не имеют `creates:E` intent'а. R3 detail
выводится, R1 catalog — нет. До этого фикса R7 precondition проваливался,
my_*_list не создавался, authored `my_*` projections оставались uncovered.

**Priority**: если оба (catalog + detail) существуют — приоритет catalog
для witnesses inheritance (стабильность). Только detail — R3 становится
sole base.

**Witnesses**: наследуются от того base, который доступен. Новое поле в
input — `sourceBase`. `sourceCatalog` сохранён для backward compat.

```js
ontology.entities.Deal = {
  ownerField: ["customerId", "executorId"],
  fields: {...},
};

intents = {
  accept_response: { particles: { effects: [
    { α: "replace", target: "response.status" },
    { α: "create",  target: "deal" },  // side-effect creation
  ]}},
  edit_deal:  {...},
  close_deal: {...},
};

// Было: deal_list undefined → my_deal_list undefined (R7b не срабатывал)
// Стало: deal_detail derived (R3) → my_deal_list derived (R7b через fallback)
//        filter: { kind: "disjunction", fields: [...], op: "=", value: "me.id" }
```

Emprical motivation: [DubovskiyIM/idf#60](https://github.com/DubovskiyIM/idf/pull/60) surfaced этот blocker
на freelance.Deal (ownerField uniquely array, но R1 не выведен).

**Backward compat**: zero breaking.
- Entities с R1 catalog + ownerField → unchanged (catalog остаётся
  primary base).
- Entities без catalog но с detail + ownerField → **теперь** получают
  my_*_list (новая capability).
- Entities без base вовсе → не затронуты (nothing to filter).

Тесты: +4 в `witnesses.test.js` (side-effect entity R7, side-effect R7b,
catalog priority over detail, no-base negative). **841/841 зелёные**,
functoriality probe без регрессий.

Spec: `idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md`
(R-rule evolution map).
