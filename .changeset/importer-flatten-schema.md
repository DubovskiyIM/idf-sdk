---
"@intent-driven/importer-openapi": minor
---

Поддержка OpenAPI composition (`allOf` / `oneOf` / `anyOf`) в `importOpenApi`.

**Problem:** до этого релиза каждый `components.schemas.X` превращался в separate entity даже если schema — envelope поверх других (типичный REST pattern: `PolicyBase + CustomPolicyContent → CustomPolicy → Policy`). В ontology попадали пустые entities с только id + synthetic FK.

**Закрывает:**
- **Gravitino G32** — PolicyBase/PolicyMetadata/CustomPolicy/Policy теперь сливаются в один Policy entity с полями `name`, `comment`, `policyType`, `enabled`, `audit`, `inherited`, `content`.
- **Backlog §9.2** — envelope-типы не различались.

**Реализация:**

Новая функция `flattenSchema(schema, spec, seen?)`:
- `$ref` → `resolveRef` + рекурсивный flatten (с cycle-guard через `seen`)
- `allOf` → merge `properties` + `required` от всех ветвей (+ inline self-properties)
- `oneOf[single]` → unwrap
- `oneOf[multiple]` / `anyOf[multiple]` → union properties (first-wins on collision) + добавляет discriminator property с enum из mapping
- Cycle в `$ref` → `null` (было: throw из resolveRef)

Вызывается из `importOpenApi` перед `schemaToEntity`:
```js
const flat = flattenSchema(schema, spec);
const entity = schemaToEntity(name, flat);
```

`schemaToEntity` слегка смягчён — принимает schema без explicit `type` (flatten может опустить hint), пока есть `properties`.

**Scope:** top-level composition. Nested property schemas (e.g., `Policy.content: { $ref: "#/CustomPolicyContent" }`) остаются как есть — `schemaToEntity` использует только top-level `properties.type/format`, deeper flatten был бы over-engineering.

**Tests:** 74 (+21): раздельные наборы для backward-compat, `$ref` resolution (+ cycle), allOf (4), oneOf/anyOf (4), полный Gravitino G32 case.
