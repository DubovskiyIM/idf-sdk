---
"@intent-driven/core": minor
---

feat(core): R3b — singleton owner-scoped detail rule

Расширение R3: когда entity объявлен `singleton: true` + `ownerField` (string,
single-owner) — deriveProjections выводит **дополнительную** проекцию
`my_<entity>_detail` без idParam, с owner-фильтром. Применяется к сущностям
по одной записи на пользователя (Wallet, RiskProfile, UserSettings).

```js
ontology.entities.Wallet = {
  ownerField: "userId",
  singleton: true,       // новый флаг
  fields: { userId: {...}, balance: {...} },
};
```

→ derived:
- `wallet_detail` — обычный R3 detail (base detail, требует idParam для admin)
- `my_wallet_detail` — **новое**, R3b singleton: без idParam, filter
  `{field: "userId", op: "=", value: "me.id"}`, пометка `singleton: true`

Witness basis:"crystallize-rule", ruleId:"R3b".

**Constraints**:
- R3b требует `entity.singleton === true` (явный opt-in)
- `ownerField` должен быть string (не array — R3b не совместим с R7b multi-owner)
- Base detail (R3) должен быть выведен — R3b зависит от R3

**Motivation**: freelance.wallet uncovered в idf#58 baseline — detail с
owner-filter как паттерн. Без R3b авторы пишут такие проекции вручную.

Mutual exclusion с R7b: R3b требует single ownerField, R7b требует array
≥2. Общая логика: author выбирает single (R7+R3b) vs multi (R7b).

Spec: `idf-manifest-v2.1/docs/design/rule-R3b-singleton-detail-spec.md`
(draft).

**Backward compat**: zero breaking. `entity.singleton` — новый opt-in флаг.
Entities без этого флага ведут себя как раньше.

Тесты: +4 в witnesses.test.js (positive singleton, negative без флага,
negative с array ownerField, negative без base R3 detail).
**837/837 зелёные**, functoriality probe без регрессий.

Renderer: primitive для singleton-detail (без route-params) — отдельный
follow-up в @intent-driven/renderer.

Stacked on [#73](https://github.com/DubovskiyIM/idf-sdk/pull/73) (R7b).
