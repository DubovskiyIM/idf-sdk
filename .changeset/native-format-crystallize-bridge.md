---
"@intent-driven/core": minor
---

**Native-format → legacy bridge в crystallizeV2** + новый stable pattern `catalog-action-cta` (Workzilla dogfood findings P0-1, backlog §8.1).

Раньше native-format intent'ы (importer-postgres / -openapi / -prisma emit + scaffold-path авторы) не доходили до toolbar / item.intents в catalog и detail архетипах. Native-format:

```js
{
  target: "Task",
  alpha: "replace",
  permittedFor: ["customer"],
  parameters: { id: { type: "string", required: true }, title: { type } },
  particles: { effects: [{ target: "Task", op: "replace" }] },
}
```

Crystallize_v2 читает `particles.entities`, `particles.effects[].α`, array-parameters — которых в native-format нет. Без них `appliesToProjection` проваливает intent как не-относящийся к mainEntity, `selectArchetype` возвращает null (нет `confirmation`), и UI-generation даёт пустой toolbar.

**Нормализация `normalizeIntentsMap`** (`crystallize_v2/normalizeIntentNative.js`) применяется сразу после `sortKeys` в crystallizeV2 entry:

1. `intent.target` → `particles.entities: ["<alias>: <Target>"]` (если пусто).
2. `particles.effects[i].op` → `α` + target нормализация:
   - `op:"insert"` → `{α:"add", target: <plural lowercase>}`
   - `op:"replace"|"update"` → `{α:"replace", target: <lowercase>}`
   - `op:"remove"|"delete"` → `{α:"remove", target: <lowercase>}`
3. `parameters: {obj}` → `parameters: [array]`.
4. `particles.confirmation` инфер из α (только для native-intent'ов):
   - `α:"add"` → `"enter"` (composer / heroCreate)
   - `α:"replace"` → `"form"` если user-params > 0, иначе `"click"`
   - `α:"remove"` → `"click"`

Normalization **additive-only**: legacy-intent'ы (с `particles.entities`, `effects[].α`) проходят через no-op. `normalizeIntentsMap` идемпотентно — повторный вызов возвращает тот же объект.

**Stable pattern `catalog-action-cta`** (`patterns/stable/catalog/`):

- Trigger: catalog с ≥1 replace-intent на mainEntity.
- Apply: тагирует `body.item.intents` с `source:"derived:catalog-action-cta"` (matching/metadata — routing уже сделан в `assignToSlotsCatalog::isPerItemIntent`).
- Назначение: формально фиксирует §8.1 acceptance + unlock Studio X-ray tracing.

Stable-count: 31 → 32.

**Интеграция-тесты:** `nativeScaffold.test.js` проверяет что Workzilla-like ontology (native-format intents) производит populated `item.intents` + `toolbar`. Закрывает Workzilla acceptance "editTask / publishTask видны customer'у в task_list".
