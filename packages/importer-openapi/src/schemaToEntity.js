import { flattenSchema } from "./flattenSchema.js";

const TYPE_MAP = {
  string: "string",
  integer: "number",
  number: "number",
  boolean: "boolean",
  object: "json",
  array: "json",
};

const PRIMARY_TITLE_NAMES = new Set(["title", "name", "label"]);
const DATE_WITNESS_SUFFIXES = ["_at", "_on", "At", "On"];
const CONTACT_NAMES = new Set(["email", "phone"]);
const MONEY_NAMES = new Set(["price", "amount", "total", "cost", "fee"]);
const STATUS_PREFIXES = ["is_", "has_", "is", "has"];
const OWNER_FIELDS = ["userId", "user_id", "ownerId", "owner_id", "authorId", "author_id", "createdBy", "created_by"];

function inferRole(name, type, format) {
  if (format === "date-time" || format === "date") return "date-witness";
  const lower = name.toLowerCase();
  if (PRIMARY_TITLE_NAMES.has(lower)) return "primary-title";
  if (DATE_WITNESS_SUFFIXES.some((s) => name.endsWith(s))) return "date-witness";
  if (CONTACT_NAMES.has(lower)) return "contact";
  if (MONEY_NAMES.has(lower) && type === "number") return "money";
  if (type === "boolean") {
    for (const p of STATUS_PREFIXES) {
      if (name.startsWith(p)) return "status-flag";
    }
  }
  return undefined;
}

/**
 * 10.6 ArgoCD gap closed: если propSchema — $ref (или резолвится в
 * object через allOf/oneOf), возвращаем эффективный shape для определения
 * type'а. Без этого все K8s nested object поля ($ref на ObjectMeta /
 * ApplicationSpec / ApplicationStatus) fallback'ились в "string" потому
 * что schema.type был undefined на unresolved $ref.
 *
 * opts.spec — root OpenAPI spec для resolveRef.
 */
function resolveEffectiveSchema(schema, spec) {
  if (!schema || typeof schema !== "object") return schema;
  if (!spec) return schema;
  const hasComposition = schema.$ref
    || schema.allOf || schema.oneOf || schema.anyOf;
  if (!hasComposition) return schema;
  try {
    return flattenSchema(schema, spec) || schema;
  } catch {
    return schema;
  }
}

export function propertyToField(name, schema, opts = {}) {
  const effective = resolveEffectiveSchema(schema, opts.spec);
  const source = effective || schema;

  // Array-of-$ref: preserve "json" если items имеет $ref/composition
  let itemsShape = null;
  if (source.type === "array" && source.items) {
    itemsShape = resolveEffectiveSchema(source.items, opts.spec);
  }

  const format = source.format;
  let type = TYPE_MAP[source.type] ?? "string";

  // $ref'd object без explicit type но с properties → "json"
  if (!source.type && source.properties) type = "json";
  // $ref цикл прервал flatten → null, fallback "json" чтобы не потерять
  if (!source.type && schema.$ref) type = "json";

  if (format === "date-time" || format === "date") type = "datetime";

  const role = inferRole(name, type, format);
  const field = { type };
  if (role) field.role = role;
  if (source.readOnly || role === "date-witness" || name === "id") field.readOnly = true;
  if (source.default !== undefined) field.default = source.default;
  if (Array.isArray(source.enum)) field.values = source.enum;

  // array item-shape hint для downstream renderer'ов
  if (type === "json" && source.type === "array" && itemsShape) {
    field.itemsType = itemsShape.type === "object" || itemsShape.properties
      ? "object" : (itemsShape.type || "any");
  }

  return field;
}

export function schemaToEntity(name, schema, opts = {}) {
  // Ожидает flattened schema (caller должен flattenSchema'ить раньше для
  // allOf/oneOf). Раньше требовало `type === "object"` strict; теперь
  // принимает schema без explicit type если есть properties — результат
  // flattenSchema может опустить type hint.
  if (!schema) return null;
  const effectiveType = schema.type || (schema.properties ? "object" : null);
  if (effectiveType !== "object" || !schema.properties) return null;

  const fields = {};
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    fields[propName] = propertyToField(propName, propSchema, opts);
  }

  const ownerField = Object.keys(schema.properties).find((k) =>
    OWNER_FIELDS.includes(k)
  );

  const entity = { name, kind: "internal", fields };
  if (ownerField) entity.ownerField = ownerField;
  return entity;
}
