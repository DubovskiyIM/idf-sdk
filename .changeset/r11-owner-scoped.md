---
"@intent-driven/core": minor
---

feat(core): R11 v2 — owner-scoped temporal feed (my_<entity>_feed)

Расширение R11: если entity имеет `temporal: true` **И** `ownerField` (string) —
генерируется **дополнительно** `my_<entity>_feed` с owner-фильтром + temporal sort.

Аналог отношения R1 → R7 для временных лент.

```js
ontology.entities.Insight = {
  temporal: true,
  ownerField: "userId",     // R11 v2 trigger (в дополнение к temporal)
  fields: { userId: {...}, createdAt: {...} },
};
```

→ derived (в дополнение к R1 catalog и public `insight_feed`):
- **`my_insight_feed`** — kind:"feed", filter:{field:"userId", ...}, sort:"-createdAt"

Witness `ruleId:"R11"` получает `input.ownerScoped: true` и `input.ownerField`.

Constraints:
- `entity.temporal === true` + `ownerField` (string) — оба нужны
- Array ownerField (multi-owner) не триггерит — future R11b candidate (disjunction feed)
- Fallback-friendly: base может быть R1 catalog ИЛИ R3 detail

**Motivation**: reflect.insights_feed uncovered в baseline — authored feed с
owner-filter. Public R11 не matched из-за filter-presence mismatch. Owner-scoped
variant закрывает кейс.

**Empirical trigger**: [DubovskiyIM/idf#64](https://github.com/DubovskiyIM/idf/pull/64) surfaced.

Spec: `idf-manifest-v2.1/docs/design/rule-R11-temporal-feed-spec.md` (updated).

**Backward compat**: zero breaking.
- Entities с `temporal:true` без `ownerField` → поведение unchanged (только public feed).
- Entities с `temporal:true` + string `ownerField` → **новая** capability.
- Entities без `temporal` → не затронуты.

Тесты: +2 в witnesses.test.js (positive owner-scoped, array ownerField
не-триггер). **863/863 зелёные**, functoriality probe без регрессий.
