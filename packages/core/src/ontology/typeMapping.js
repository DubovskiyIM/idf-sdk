/**
 * Canonical type-map + auto field-mapping bridge (P0.4 — backlog §9.1, 2026-04-26).
 *
 * Закрывает три полевых боли, наблюдаемых в трёх независимых production-стэках:
 *  - 70+ ручных трансформ camelCase ↔ snake_case при FE↔BE bridge;
 *  - 200+ нормалайзеров `field-mapping` (`{dataSourceId} ↔ {'data source': ...}`);
 *  - importers (postgres / openapi / prisma) кладут `type: "string"`, а
 *    crystallize_v2 ждёт canonical `text` — silent drop без manual mapping.
 *
 * Этот модуль даёт:
 *   1. `CANONICAL_TYPES` — закрытое множество канонических типов;
 *   2. `TYPE_ALIASES` — словарь синонимов (`string → text`, `int → number`,
 *      `timestamp → datetime`, `bool → boolean`...);
 *   3. `normalizeFieldType(rawType)` — alias → canonical lookup;
 *   4. `normalizeFieldDef(rawFieldDef)` — нормализует целое поле;
 *   5. `camelToSnake(name)` / `snakeToCamel(name)` — name-bridge;
 *   6. `inferWireFieldName(canonicalName, { case })` — авто-derive имени на проводе;
 *   7. `applyFieldMapping(obj, mapping, direction)` — преобразование объекта;
 *   8. `buildAutoFieldMapping(fields, options)` — авто-генерация mapping'а
 *      из ontology fields; используется importers / effect-runners.
 *
 * Status: utility-layer. Не trigger'ится автоматически в fold/filterWorld;
 * importers и effect-runners (в т.ч. third-party) могут начать использовать
 * сразу. Backward-compatible: legacy `type: "string"` всё ещё работает
 * (через alias), новые типы — additive.
 */

/**
 * Closed-set канонических типов. Любой ontology field type должен
 * нормализоваться в один из них через `normalizeFieldType`.
 */
export const CANONICAL_TYPES = Object.freeze([
  // Text family
  "text",
  "textarea",
  "markdown",
  "richText",
  "code",
  "yaml",
  "json",

  // Numeric family
  "number",
  "integer",
  "decimal",
  "money",
  "percentage",

  // Boolean
  "boolean",

  // Time family
  "date",
  "time",
  "datetime",
  "duration",

  // Identifier family
  "id",
  "uuid",
  "slug",

  // Communication
  "email",
  "url",
  "phone",
  "tel",

  // Sensitive
  "secret",
  "password",

  // Categorical
  "select",
  "multiSelect",
  "enum",

  // Relations
  "entityRef",
  "entityRefArray",
  "foreignKey",

  // Media
  "image",
  "multiImage",
  "file",
  "color",

  // Spatial (§16a v1.7)
  "coordinate",
  "address",
  "zone",

  // Domain-specific (free-text canonical for now)
  "ticker",
  "manifest",
]);

const CANONICAL_SET = new Set(CANONICAL_TYPES);

/**
 * Aliases: maps non-canonical type names to canonical. Emitted by importers
 * (importer-postgres uses pg type names, importer-openapi uses OpenAPI/JSON
 * Schema primitive types, importer-prisma uses Prisma scalar types) plus
 * legacy hand-authored ontologies.
 */
export const TYPE_ALIASES = Object.freeze({
  // String family — все мапим в text по умолчанию
  string: "text",
  varchar: "text",
  char: "text",
  clob: "text",
  String: "text",
  TEXT: "text",
  // Long-form text
  longtext: "textarea",
  mediumtext: "textarea",
  // Numeric
  int: "integer",
  Int: "integer",
  int4: "integer",
  int8: "integer",
  bigint: "integer",
  smallint: "integer",
  tinyint: "integer",
  serial: "integer",
  bigserial: "integer",
  Integer: "integer",
  // Decimal/float — separate canonical
  float: "decimal",
  float4: "decimal",
  float8: "decimal",
  double: "decimal",
  numeric: "decimal",
  real: "decimal",
  Float: "decimal",
  Decimal: "decimal",
  // Boolean
  bool: "boolean",
  Boolean: "boolean",
  bit: "boolean",
  // Time
  timestamp: "datetime",
  timestamptz: "datetime",
  DateTime: "datetime",
  // (date/time/datetime — already canonical)
  // Identifier
  UUID: "uuid",
  // JSON
  jsonb: "json",
  Json: "json",
  // Currency
  currency: "money",
  // Phone (canonical `phone`, legacy `tel`)
  // FK
  reference: "entityRef",
  ref: "entityRef",
  ManyToOne: "entityRef",
  OneToMany: "entityRefArray",
  ManyToMany: "entityRefArray",
});

/**
 * Принимает raw type (из importer'а, hand-authored ontology, JSON schema, etc.)
 * и возвращает canonical type. Если type уже канонический — без изменений.
 * Если не найден ни в canonical, ни в aliases — возвращает оригинал
 * (graceful degradation вместо silent drop).
 *
 * @param {string | undefined | null} rawType
 * @returns {string}
 */
export function normalizeFieldType(rawType) {
  if (rawType === null || rawType === undefined) return "text";
  if (typeof rawType !== "string") return "text";
  if (CANONICAL_SET.has(rawType)) return rawType;
  const aliased = TYPE_ALIASES[rawType];
  if (aliased) return aliased;
  // Case-insensitive fallback (Postgres-shouty / Prisma-Pascal)
  const lower = rawType.toLowerCase();
  if (CANONICAL_SET.has(lower)) return lower;
  if (TYPE_ALIASES[lower]) return TYPE_ALIASES[lower];
  return rawType;
}

/**
 * Нормализует целый field-def: применяет normalizeFieldType к field.type.
 * Дополнительно — derive `references` из `foreignKey` shape (importer
 * convention `{ kind: "foreignKey", references: "Entity" }` → плоский).
 *
 * Не мутирует input (returns new object).
 *
 * @param {object | undefined} fieldDef
 * @returns {object}
 */
export function normalizeFieldDef(fieldDef) {
  if (!fieldDef || typeof fieldDef !== "object") return { type: "text" };
  const out = { ...fieldDef };
  if (out.type !== undefined) {
    out.type = normalizeFieldType(out.type);
  } else if (typeof out.references === "string" && out.references) {
    out.type = out.array || out.multi || out.many ? "entityRefArray" : "entityRef";
  } else if (typeof out.entityRef === "string" && out.entityRef) {
    out.type = out.array || out.multi || out.many ? "entityRefArray" : "entityRef";
    if (!out.references) out.references = out.entityRef;
  } else {
    out.type = "text";
  }
  return out;
}

/* ------------------------- Name-bridge ------------------------- */

/**
 * Convert `botToken` / `helloWorld` → `bot_token` / `hello_world`.
 * Idempotent: snake_case input passes through untouched (sans uppercase).
 *
 * @param {string} name
 * @returns {string}
 */
export function camelToSnake(name) {
  if (typeof name !== "string" || !name) return name;
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/**
 * Convert `bot_token` / `hello_world` → `botToken` / `helloWorld`.
 * Idempotent: camelCase input passes through.
 *
 * @param {string} name
 * @returns {string}
 */
export function snakeToCamel(name) {
  if (typeof name !== "string" || !name) return name;
  return name.replace(/_+([a-z0-9])/gi, (_, c) => c.toUpperCase());
}

/**
 * Auto-derive имя поля «на проводе» из canonical (camelCase) имени.
 * `case`: `"snake"` (default) | `"camel"` | `"original"`.
 *
 * @param {string} canonicalName
 * @param {{ case?: "snake" | "camel" | "original" }} [options]
 * @returns {string}
 */
export function inferWireFieldName(canonicalName, options = {}) {
  const wireCase = options.case || "snake";
  if (wireCase === "snake") return camelToSnake(canonicalName);
  if (wireCase === "camel") return snakeToCamel(canonicalName);
  return canonicalName;
}

/* ------------------------- Field-mapping ------------------------- */

/**
 * Применить explicit field mapping к объекту. Direction — куда мапим:
 *   `"toWire"`  — canonical → wire (FE → BE serialize);
 *   `"fromWire"` — wire → canonical (BE → FE deserialize).
 *
 * Mapping shape: `{ [canonicalName]: wireName }`.
 *   `applyFieldMapping({ botToken: "abc" }, { botToken: "bot_token" }, "toWire")`
 *     → `{ bot_token: "abc" }`
 *   `applyFieldMapping({ bot_token: "abc" }, { botToken: "bot_token" }, "fromWire")`
 *     → `{ botToken: "abc" }`
 *
 * Поля, отсутствующие в mapping'е, передаются как есть.
 * Не мутирует input.
 *
 * @param {Record<string, unknown>} obj
 * @param {Record<string, string>} mapping
 * @param {"toWire" | "fromWire"} direction
 * @returns {Record<string, unknown>}
 */
export function applyFieldMapping(obj, mapping, direction = "toWire") {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  if (!mapping || typeof mapping !== "object") return { ...obj };
  const out = {};

  if (direction === "toWire") {
    for (const [k, v] of Object.entries(obj)) {
      const wireName = mapping[k] ?? k;
      out[wireName] = v;
    }
    return out;
  }

  if (direction === "fromWire") {
    const reverse = {};
    for (const [canon, wire] of Object.entries(mapping)) {
      if (typeof wire === "string") reverse[wire] = canon;
    }
    for (const [k, v] of Object.entries(obj)) {
      const canonName = reverse[k] ?? k;
      out[canonName] = v;
    }
    return out;
  }

  return { ...obj };
}

/**
 * Авто-сгенерировать field-mapping из массива canonical имён по convention.
 * Используется importers / effect-runners когда нет explicit declaration.
 *
 * Если canonical имя поля при `inferWireFieldName` совпадает с самим именем
 * (нет CamelCase → snake_case разницы), оно НЕ попадает в mapping
 * (mapping содержит только нетривиальные пары).
 *
 * @param {string[] | Record<string, unknown>} fields
 * @param {{ case?: "snake" | "camel" | "original" }} [options]
 * @returns {Record<string, string>}
 */
export function buildAutoFieldMapping(fields, options = {}) {
  const names = Array.isArray(fields)
    ? fields
    : (fields && typeof fields === "object" ? Object.keys(fields) : []);
  const mapping = {};
  for (const name of names) {
    if (typeof name !== "string" || !name) continue;
    const wire = inferWireFieldName(name, options);
    if (wire !== name) mapping[name] = wire;
  }
  return mapping;
}
