import { resolveRef } from "./resolveRef.js";

/**
 * Рекурсивно резолвит $ref + сплющивает allOf / oneOf композиции
 * в единый object-schema с union properties.
 *
 * Закрывает backlog §9.2 (envelope-типы) и Gravitino G32 (PolicyBase +
 * CustomPolicy allOf + Policy oneOf → flat Policy entity с name / comment /
 * type / enabled / content / audit).
 *
 * Правила:
 *   - $ref → resolveRef + recurse (с cycle-guard через `seen`)
 *   - allOf → flat-merge properties + required от каждого элемента (плюс
 *     inline this-schema fields, если есть)
 *   - oneOf с single element → unwrap (discriminator redundant для одного)
 *   - oneOf с multiple → union over all variants (over-approximation;
 *     полноценный polymorphic type — future work)
 *   - anyOf — та же стратегия что oneOf (union)
 *
 * Type preservation: если любая ветвь имеет `type: "object"` —
 * результат `type: "object"`. description от outer-schema доминирует.
 */
export function flattenSchema(schema, spec, seen = new Set()) {
  if (!schema || typeof schema !== "object") return schema;

  if (schema.$ref) {
    if (seen.has(schema.$ref)) return null;
    const next = new Set(seen);
    next.add(schema.$ref);
    let resolved;
    try {
      resolved = resolveRef(schema, spec);
    } catch (e) {
      // resolveRef кидает на self-referencing $ref cycle — мы сами
      // защищаемся через `seen`, для flattenSchema это не ошибка.
      if (typeof e?.message === "string" && e.message.includes("Circular")) return null;
      throw e;
    }
    return flattenSchema(resolved, spec, next);
  }

  const hasAllOf = Array.isArray(schema.allOf) && schema.allOf.length > 0;
  const hasOneOf = Array.isArray(schema.oneOf) && schema.oneOf.length > 0;
  const hasAnyOf = Array.isArray(schema.anyOf) && schema.anyOf.length > 0;

  if (hasAllOf) {
    const merged = {
      type: "object",
      properties: {},
      required: [],
    };
    for (const branch of schema.allOf) {
      const flat = flattenSchema(branch, spec, seen);
      if (flat?.properties && typeof flat.properties === "object") {
        Object.assign(merged.properties, flat.properties);
      }
      if (Array.isArray(flat?.required)) merged.required.push(...flat.required);
    }
    // Inline this-schema's own properties/required (rare but valid)
    if (schema.properties && typeof schema.properties === "object") {
      Object.assign(merged.properties, schema.properties);
    }
    if (Array.isArray(schema.required)) merged.required.push(...schema.required);
    if (schema.description) merged.description = schema.description;
    if (schema.discriminator) merged.discriminator = schema.discriminator;
    return merged;
  }

  if (hasOneOf || hasAnyOf) {
    const variants = hasOneOf ? schema.oneOf : schema.anyOf;
    if (variants.length === 1) {
      const single = flattenSchema(variants[0], spec, seen);
      if (single && typeof single === "object" && !single.type) single.type = "object";
      if (schema.description && single) single.description = single.description || schema.description;
      return single;
    }
    // Multiple variants — union of all properties (over-approximation).
    // Discriminator-поле (propertyName) включаем как property со значениями
    // из mapping keys (если есть).
    const merged = {
      type: "object",
      properties: {},
    };
    for (const branch of variants) {
      const flat = flattenSchema(branch, spec, seen);
      if (flat?.properties && typeof flat.properties === "object") {
        for (const [k, v] of Object.entries(flat.properties)) {
          if (!merged.properties[k]) merged.properties[k] = v;
        }
      }
    }
    if (schema.discriminator) {
      const prop = schema.discriminator.propertyName;
      if (prop && !merged.properties[prop]) {
        const mappingKeys = schema.discriminator.mapping && typeof schema.discriminator.mapping === "object"
          ? Object.keys(schema.discriminator.mapping)
          : null;
        merged.properties[prop] = {
          type: "string",
          ...(mappingKeys && mappingKeys.length > 0 ? { enum: mappingKeys } : {}),
        };
      }
      merged.discriminator = schema.discriminator;
    }
    if (schema.description) merged.description = schema.description;
    return merged;
  }

  return schema;
}
