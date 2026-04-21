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

export function propertyToField(name, schema) {
  const format = schema.format;
  let type = TYPE_MAP[schema.type] ?? "string";
  if (format === "date-time" || format === "date") type = "datetime";

  const role = inferRole(name, type, format);
  const field = { type };
  if (role) field.role = role;
  if (schema.readOnly || role === "date-witness" || name === "id") field.readOnly = true;
  if (schema.default !== undefined) field.default = schema.default;
  if (Array.isArray(schema.enum)) field.values = schema.enum;

  return field;
}

export function schemaToEntity(name, schema) {
  if (!schema || schema.type !== "object" || !schema.properties) return null;

  const fields = {};
  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    fields[propName] = propertyToField(propName, propSchema);
  }

  const ownerField = Object.keys(schema.properties).find((k) =>
    OWNER_FIELDS.includes(k)
  );

  const entity = { name, kind: "internal", fields };
  if (ownerField) entity.ownerField = ownerField;
  return entity;
}
