import { flattenSchema } from "./flattenSchema.js";

/**
 * Server-managed metadata fields, которые не должны попадать в форму.
 * Backend сам их выставляет (audit log, generated id, server timestamps).
 * Pollutes форму, если автоматически тянуть в parameters.
 */
const SERVER_SET_FIELDS = new Set([
  "audit",
  "id",
  "createTime",
  "createdAt",
  "created_at",
  "createTimestamp",
  "lastModifier",
  "lastModified",
  "lastModifiedTime",
  "lastModifiedAt",
  "updatedAt",
  "updated_at",
  "modifyTime",
]);

const TYPE_MAP = {
  string: "string",
  integer: "number",
  number: "number",
  boolean: "boolean",
  object: "json",
  array: "json",
};

function normalizeType(rawType, schema) {
  // datetime mapping консистентен с propertyToField
  if (schema?.format === "date-time" || schema?.format === "date") return "datetime";
  if (rawType && TYPE_MAP[rawType]) return TYPE_MAP[rawType];
  // $ref'd object без explicit type → json
  if (!rawType && schema?.properties) return "json";
  // composition резолвится через flattenSchema, fallback "string"
  return "string";
}

/**
 * Extract'ит request body schema fields в intent.parameters shape.
 *
 * Применимо к POST / PUT / PATCH operations — `requestBody.content
 * ["application/json"].schema` resolved через flattenSchema (закрывает $ref,
 * allOf, oneOf single-variant; multi-variant oneOf — over-approximation
 * union, что разумно для form-rendering: автор увидит все возможные поля).
 *
 * Server-set fields (audit / id / createTime / lastModifier / ...)
 * исключаются — это backend-managed metadata, не должно быть в форме.
 *
 * Каждый body param получает marker `bodyParam: true` для
 * distinguishing от path/query (path/query → URL substitution, body →
 * request body JSON).
 *
 * Returns `{}` если operation без body или body не application/json.
 */
export function extractBodyParameters(operation, spec) {
  const reqBody = operation?.requestBody;
  if (!reqBody) return {};
  const schema = reqBody.content?.["application/json"]?.schema;
  if (!schema) return {};

  let resolved;
  try {
    resolved = flattenSchema(schema, spec);
  } catch {
    return {};
  }
  if (!resolved || typeof resolved !== "object") return {};
  if (!resolved.properties || typeof resolved.properties !== "object") return {};

  const required = new Set(Array.isArray(resolved.required) ? resolved.required : []);
  const params = {};
  for (const [name, fieldSchemaRaw] of Object.entries(resolved.properties)) {
    if (SERVER_SET_FIELDS.has(name)) continue;
    if (!fieldSchemaRaw || typeof fieldSchemaRaw !== "object") continue;

    // Resolve field schema если оно — $ref / composition (для type detection)
    let fieldSchema = fieldSchemaRaw;
    if (fieldSchemaRaw.$ref || fieldSchemaRaw.allOf || fieldSchemaRaw.oneOf || fieldSchemaRaw.anyOf) {
      try {
        const flat = flattenSchema(fieldSchemaRaw, spec);
        if (flat && typeof flat === "object") fieldSchema = flat;
      } catch {
        // оставляем raw — fallback type мап даст "string"
      }
    }

    if (fieldSchema.readOnly) continue;

    const type = normalizeType(fieldSchema.type, fieldSchema);
    const param = { type, bodyParam: true };
    if (required.has(name)) param.required = true;
    if (typeof fieldSchema.description === "string" && fieldSchema.description) {
      param.description = fieldSchema.description;
    }
    if (Array.isArray(fieldSchema.enum) && fieldSchema.enum.length > 0) {
      param.values = fieldSchema.enum;
    }
    if (fieldSchema.default !== undefined) {
      param.default = fieldSchema.default;
    }
    params[name] = param;
  }
  return params;
}
