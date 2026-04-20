---
"@intent-driven/core": minor
---

feat(patterns): `structure.apply` для `m2m-attach-dialog` + `observer-readonly-escape`.

Два новых pattern.apply из roadmap «оставшиеся 17 stable patterns».

## m2m-attach-dialog.apply

Находит assignment-entity с FK на `mainEntity` в ontology, добавляет секцию в `slots.sections`:

```js
{
  id: "m2m_assignment",
  title: "Связанные Advisors",
  kind: "attachList",
  entity: "Assignment",
  foreignKey: "portfolioId",
  otherField: "advisorId",
  otherEntity: "Advisor",
  attachControl: { type: "attachDialog", multiSelect: true, otherEntity: "Advisor" },
  source: "derived:m2m-attach-dialog",
}
```

Renderer primitive `attachList` + `attachDialog` — TODO отдельный renderer PR. Текущий fallback — универсальный SlotRenderer (section rendering через card-children).

Author-override: `projection.subCollections` (authored) → apply skip'ает.

## observer-readonly-escape.apply

Если viewer имеет `role.base === "observer"` и ≥1 high-irreversibility intent в его `canExecute`, prepend'ит `readonlyBanner`-node в `slots.header`:

```js
{
  type: "readonlyBanner",
  role: "auditor",
  escapeIntentIds: ["file_dispute", "flag_anomaly"],
  source: "derived:observer-readonly-escape",
}
```

Signal: "viewer-only mode с escape-путём" — renderer показывает badge "только просмотр" + inline reference на escape intents. Idempotent.

## Тесты

- m2m: 8 тестов (trigger + apply + edge cases).
- observer: 7 тестов (trigger + apply + idempotency).
- **1013 core passing** (+16 от 997).

## Прогресс roadmap

Было 16 оставшихся stable patterns без apply; стало 14.
