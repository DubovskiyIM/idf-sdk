---
"@intent-driven/core": minor
---

feat(ontology): §12.9 — polymorphic FK fields API (`field.kind: "polymorphicFk"`)

Закрывает SDK backlog §12.9 (Notion field-test). Канонический кейс — `Comment.pageId` XOR `Comment.blockId` в Notion. Раньше автор писал два expression-invariant'а для XOR + exactly-one constraint — теряя declarative shape и derivation-сигналы. Теперь declarative API:

```js
Comment: {
  fields: {
    pageId:  { type: "id", entity: "Page",  optional: true },
    blockId: { type: "id", entity: "Block", optional: true },
    target: {
      kind: "polymorphicFk",
      alternatives: [
        { entity: "Page",  field: "pageId"  },
        { entity: "Block", field: "blockId" },
      ],
      cardinality: "exactly-one",  // или "at-most-one"
    },
  },
}
```

`target` — virtual field (не хранится как колонка), это metadata о констрейнте. Concrete columns (`pageId`, `blockId`) объявляются как обычные FK с `optional: true`.

## API

| Функция | Назначение |
|---|---|
| `isPolymorphicFkField(fieldDef)` | type-guard |
| `getPolymorphicFkFields(entityDef)` | массив `[{ name, def }]` всех PFK-полей |
| `getActiveAlternative(row, fkDef)` | `{ entity, field, value } \| null` — какая alternative задана |
| `validatePolymorphicFkRow(row, fkDef)` | `{ ok, count, reason? }` — проверка cardinality |
| `buildPolymorphicFkInvariants(entities)` | авто-генерация expression-invariants для всех PFK в `ontology.entities` |
| `resolvePolymorphicFkParent(row, fkDef, world, resolveCollection?)` | resolve target row через FK для materializers / FK-graph |

`buildPolymorphicFkInvariants` возвращает массив, который автор может либо скопировать в `ontology.invariants`, либо host SDK / engine может вызвать на init. Predicate использует `validatePolymorphicFkRow.ok`.

## Cardinality

- `exactly-one` (default) — ровно одна alternative непустая
- `at-most-one` — 0 или 1 (для optional FK)

## Backwards-compat

Legacy схема (concrete `pageId` / `blockId` без virtual `target` + ручные expression invariants) продолжает работать. Migration host'а опциональна.

## Тесты

29 unit-тестов (`packages/core/src/ontology/polymorphicFk.test.js`):
- `isPolymorphicFkField` (4)
- `getPolymorphicFkFields` (3)
- `getActiveAlternative` (4)
- `validatePolymorphicFkRow` exactly-one + at-most-one + invalid (8)
- `buildPolymorphicFkInvariants` (4)
- `resolvePolymorphicFkParent` (5)

Полный core: **1827/1827 passing**.
