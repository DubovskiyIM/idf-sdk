---
"@intent-driven/core": minor
---

feat(ontology): canonical type-map + auto field-mapping FE↔BE (P0.4 — backlog §9.1, 2026-04-26)

Закрывает три полевых боли, наблюдаемых в трёх независимых production-стэках:
- 70+ ручных трансформ `camelCase ↔ snake_case` при FE↔BE bridge;
- 200+ нормалайзеров (`{dataSourceId} ↔ {'data source': ...}`);
- importers (postgres / openapi / prisma) кладут `type: "string"`, а `crystallize_v2` ждёт canonical `text` — silent drop без manual mapping.

## Новый API в `@intent-driven/core` (re-exported из `core/src/index.js`)

| Function | Назначение |
|---|---|
| `CANONICAL_TYPES` | frozen-list (~40) канонических field-types: text/textarea/markdown/json/yaml/code, number/integer/decimal/money/percentage, boolean, date/time/datetime/duration, id/uuid/slug, email/url/phone/secret, select/multiSelect/enum, entityRef/entityRefArray/foreignKey, image/file/color, coordinate/address/zone, ticker, manifest |
| `TYPE_ALIASES` | словарь aliases → canonical: `string→text`, `int/bigint/serial→integer`, `float/double/numeric→decimal`, `bool→boolean`, `timestamp→datetime`, `jsonb→json`, `ManyToOne→entityRef`, etc. |
| `normalizeFieldType(rawType)` | alias → canonical lookup, case-insensitive fallback, graceful degradation для unknown |
| `normalizeFieldDef(rawFieldDef)` | нормализует целое поле + derive `entityRef` shape из `references` / `entityRef` shorthand |
| `camelToSnake(name)` / `snakeToCamel(name)` | name-bridge с поддержкой acronym-runs (URLPath → url_path) |
| `inferWireFieldName(name, { case })` | auto-derive «имени на проводе» |
| `applyFieldMapping(obj, mapping, "toWire" \| "fromWire")` | преобразует ключи объекта по explicit mapping без мутации |
| `buildAutoFieldMapping(fields, options)` | авто-генерация mapping'а из ontology fields (тривиальные пары исключаются) |

## Use-cases

- **Importers** (postgres / openapi / prisma): kладут `type: "string"` → `normalizeFieldType` приводит к `text`. `references: "User"` → автоматически `type: "entityRef"`.
- **Effect-runners**: `applyFieldMapping(payload, mapping, "toWire")` перед PUT/POST на BE; `applyFieldMapping(response, mapping, "fromWire")` после GET.
- **Crystallize_v2 input cleanup**: `normalizeFieldDef` поверх raw fields перед `buildFormSpec` — закрывает Workzilla post-bump §9.1 (`type:"string"` теперь корректно превращается в text-control).

## Status: utility-layer

Не trigger'ится автоматически в fold/filterWorld. Importers и effect-runners (включая third-party) могут начать использовать сразу. Backward-compatible: legacy `type: "string"` продолжает работать (через alias), новые типы — additive.

43 новых теста в `packages/core/src/ontology/typeMapping.test.js` (suite 1616 → 1659).
