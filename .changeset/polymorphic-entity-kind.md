---
"@intent-driven/core": minor
---

feat(ontology): `entity.kind: "polymorphic"` + `discriminator` + `variants[]` API (P0.2 — §14 ext, 2026-04-26)

Расширение taxonomy `entity.kind` (раньше: `internal` / `reference` / `mirror` / `assignment`) — добавлен `polymorphic`. Полевые тесты с 70+ и 200+ подтипами кубов в production workflow-editor стэках показали, что без формализации polymorphic entity host-авторам приходится держать 3 параллельных декларации (frontend type / backend DTO / form-renderer) — итого ~21k LOC ручного бойлерплейта на 70 типов. Эта surface закрывает gap на ontology-уровне: одна декларация → всё derive'ится.

Схема:

```js
WorkflowNode: {
  kind: "polymorphic",
  discriminator: "type",
  fields: {
    // base fields shared by all variants
    id: { type: "id" },
    type: { type: "select" },
    label: { type: "text" },
    workflowId: { references: "Workflow" },
  },
  variants: {
    ManualTrigger: { label: "Manual trigger", fields: {} },
    TelegramTrigger: {
      label: "Telegram trigger",
      fields: {
        botToken: { type: "secret", fieldRole: "auth" },
        webhookUrl: { type: "url" },
      },
      invariants: [{ kind: "expression", expr: "..." }],
    },
    // ...
  },
}
```

Новый публичный API в `@intent-driven/core`:

- `isPolymorphicEntity(entityDef) → boolean`
- `getDiscriminatorField(entityDef) → string | null`
- `getEntityVariants(entityDef) → Record<string, variantDef>`
- `getEntityVariant(entityDef, value) → variantDef | null`
- `listVariantValues(entityDef) → string[]` — для wizard'а / dropdown options
- `getEffectiveFields(entityDef, value?) → fieldsDict` — base + active variant fields (variant override priority)
- `getUnionFields(entityDef) → fieldsDict` — base + ВСЕ variants (для form-archetype synthesis с conditional visibility)
- `getVariantSpecificFields(entityDef, value) → string[]` — fields only present in variant
- `validatePolymorphicEntity(entityDef) → { valid, errors[] }` — schema-валидатор с понятными ошибками

**Status:** matching-only / declarative API. Production-derivation (form-archetype synthesis на discriminator + per-variant fields, filterWorld awareness, materializer-output) — отдельный sub-project. Host'ы могут начать использовать API сразу — backward-compat реализован: legacy entity без `kind:"polymorphic"` обрабатывается прозрачно (`getEffectiveFields` возвращает base.fields, `getUnionFields` тоже, validate всегда `valid: true`).

30 новых тестов в `packages/core/src/ontology/polymorphic.test.js` (suite 1586 → 1616).
