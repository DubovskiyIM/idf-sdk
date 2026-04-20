---
"@intent-driven/core": minor
---

feat(core): R11 — temporal feed rule

Новое правило деривации. Entity с opt-in флагом `temporal: true` получает
**дополнительную** проекцию `<entity>_feed` с `kind:"feed"` + `sort:"-<timestampField>"`.
Применяется к event-like сущностям (Insight, Notification, Activity) —
монотонно растущие append-only потоки.

```js
ontology.entities.Insight = {
  temporal: true,                  // R11 trigger
  timestampField: "createdAt",     // опционально, default "createdAt"
  fields: { createdAt: {...}, ...},
};
```

→ derived (дополнительно к R1 catalog):
- `insight_feed` — kind:"feed", sort:"-createdAt"

Witness `basis:"crystallize-rule"`, `ruleId:"R11"`.

**Fallback-friendly**: при отсутствии R1 catalog, R11 использует R3 detail
как base (тот же паттерн, что R7 v2). `sourceBase` записывается в witness
input для trail-видимости.

Constraints:
- Требует `entity.temporal === true` — explicit opt-in
- Нужен R1 catalog ИЛИ R3 detail как base
- Generates `<entity>_feed` **в дополнение** к catalog, не заменяет

**Mutual exclusion** с R2 (confirmation:"enter" + FK override): R2 и R11
могут сосуществовать. R2 создаёт `<entity>_list` с kind:"feed" (замена
catalog). R11 создаёт отдельный `<entity>_feed` key. Semantically R2 —
messaging (scoped by parent conversation), R11 — event streams (глобально).

**Motivation**: reflect.insights_feed uncovered в baseline — временная
лента aналитических insights. Без R11 authored feed с sort:"-createdAt"
писался вручную. После: `Insight.temporal = true` → автоматически.

Spec: `idf-manifest-v2.1/docs/design/rule-R11-temporal-feed-spec.md` (draft).

**Backward compat**: zero breaking. `entity.temporal` — новый opt-in флаг.
Entities без этого флага — поведение unchanged.

Тесты: +4 в witnesses.test.js (basic temporal feed, explicit
timestampField override, no-flag negative, R3 detail fallback).
**845/845 зелёные**, functoriality probe без регрессий.

**Completes R-rule roadmap to 13 правил**:
R1, R1b, R2, R3, R3b, R4, R6, R7 v2, R7b, R8, R9, R10, **R11**.
