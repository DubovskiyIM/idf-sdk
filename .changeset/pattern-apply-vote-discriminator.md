---
"@intent-driven/core": minor
---

feat(patterns): `structure.apply` для `vote-group` + `discriminator-wizard`.

## vote-group.apply

Находит intents с `creates: "Entity(variant)"`, группирует по base entity, emit'ит `slots._voteGroups`:

```js
slots._voteGroups = {
  Vote: [
    { intentId: "vote_yes",   value: "yes",   label: "Да" },
    { intentId: "vote_no",    value: "no",    label: "Нет" },
    { intentId: "vote_maybe", value: "maybe", label: "Может быть" },
  ],
  _source: "derived:vote-group",
}
```

Только группы с ≥2 variants попадают (singletons исключаются). Renderer (SubCollectionItem / ArchetypeDetail) может заменить дубль intent-buttons единой voteGroup-виджет.

## discriminator-wizard.apply

Находит entity с discriminator field (`type` / `provider` / `kind` / `category`) с ≥2 select-options + create-intent, emit'ит `slots._wizardCandidates`:

```js
slots._wizardCandidates = [{
  discriminatorField: "type",
  variants: ["hive", "iceberg", "kafka"],
  creatorIntentId: "create_catalog",
  source: "derived:discriminator-wizard",
}]
```

Renderer может заменить обычный FormModal на multi-step wizard (step 1 — выбор variant, step 2+ — variant-specific поля).

**Scope**: metadata-only в обоих apply. Полноценная UI-интеграция (voteGroup-widget, wizard-overlay) — future renderer work.

## Тесты

- `vote-group.test.js` — **7 тестов**.
- `discriminator-wizard.test.js` — **8 тестов**.
- **1034 core** passing (+15).

## Roadmap progress

Было 10 → **8** оставшихся stable patterns без apply (8/16 за 5 PR — **half way**).
