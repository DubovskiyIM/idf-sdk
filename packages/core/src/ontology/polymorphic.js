/**
 * Polymorphic entity-kind helpers (§14 ext, P0.2 — 2026-04-26).
 *
 * Поддержка `entity.kind: "polymorphic"` + `entity.discriminator: "<fieldName>"`
 * + `entity.variants: { [value]: variantDef }`. Полевые тесты с 70+ и 200+
 * подтипами кубов в workflow-editor стэках показали, что без формализации
 * polymorphic entity host-авторам приходится держать 3 параллельных декларации
 * (frontend type / backend DTO / form-renderer). Эта surface закрывает gap
 * на ontology-уровне: **одна декларация → всё derive'ится**.
 *
 * Схема:
 *   WorkflowNode: {
 *     kind: "polymorphic",
 *     discriminator: "type",
 *     fields: {
 *       // base fields — shared всеми variants
 *       id: { type: "id" },
 *       label: { type: "text" },
 *       workflowId: { references: "Workflow" },
 *     },
 *     variants: {
 *       ManualTrigger: {
 *         label: "Manual trigger",        // human-readable для wizard'а
 *         fields: {},                      // type-specific (может быть пусто)
 *       },
 *       TelegramTrigger: {
 *         label: "Telegram trigger",
 *         fields: {
 *           botToken: { type: "secret", fieldRole: "auth" },
 *           webhookUrl: { type: "url" },
 *         },
 *         invariants: [
 *           { kind: "expression", expr: "..." },
 *         ],
 *       },
 *       // ...
 *     },
 *   }
 *
 * Status: matching-only / declarative API. Production-derivation
 * (form-archetype synthesis на discriminator + per-variant fields,
 * filterWorld awareness, materializer-output) — отдельный sub-project.
 * Host'ы могут начинать использовать API сразу — backward-compatible
 * fallback'ы реализованы (legacy entity без kind:"polymorphic" работает
 * через `getEffectiveFields` без ошибок).
 */

/**
 * Является ли entity полиморфным.
 * @param {object} entityDef
 * @returns {boolean}
 */
export function isPolymorphicEntity(entityDef) {
  return !!entityDef && entityDef.kind === "polymorphic";
}

/**
 * Имя discriminator-поля для polymorphic entity. Возвращает null для
 * non-polymorphic entity или если поле не задано.
 * @param {object} entityDef
 * @returns {string | null}
 */
export function getDiscriminatorField(entityDef) {
  if (!isPolymorphicEntity(entityDef)) return null;
  const field = entityDef.discriminator;
  return typeof field === "string" && field.length > 0 ? field : null;
}

/**
 * Все variants как dict { [discriminatorValue]: variantDef }. Для
 * non-polymorphic возвращает пустой объект.
 * @param {object} entityDef
 * @returns {Record<string, object>}
 */
export function getEntityVariants(entityDef) {
  if (!isPolymorphicEntity(entityDef)) return {};
  const v = entityDef.variants;
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

/**
 * Один variant по discriminator value. null если variant не объявлен.
 * @param {object} entityDef
 * @param {string} discriminatorValue
 * @returns {object | null}
 */
export function getEntityVariant(entityDef, discriminatorValue) {
  if (typeof discriminatorValue !== "string" || !discriminatorValue) return null;
  const variants = getEntityVariants(entityDef);
  return variants[discriminatorValue] || null;
}

/**
 * Список всех discriminator-значений как массив строк (для wizard'а
 * `discriminator-wizard`, для validation, для dropdown options).
 * @param {object} entityDef
 * @returns {string[]}
 */
export function listVariantValues(entityDef) {
  return Object.keys(getEntityVariants(entityDef));
}

/**
 * Объединить base-fields и variant-fields. Когда discriminatorValue не задан
 * (или entity не polymorphic) — возвращает только base entity.fields.
 *
 * Variant fields имеют приоритет — могут override base shape (например,
 * сделать base-field required только для одного варианта).
 *
 * @param {object} entityDef
 * @param {string} [discriminatorValue]
 * @returns {Record<string, object>}
 */
export function getEffectiveFields(entityDef, discriminatorValue) {
  const baseFields = getBaseFields(entityDef);
  if (!isPolymorphicEntity(entityDef) || !discriminatorValue) {
    return baseFields;
  }
  const variant = getEntityVariant(entityDef, discriminatorValue);
  if (!variant) return baseFields;
  const variantFields = normalizeFieldsObject(variant.fields);
  return { ...baseFields, ...variantFields };
}

/**
 * Объединить ВСЕ поля (base + union по всем variants). Используется
 * form-archetype synthesis для построения «полной» schema (с conditional
 * visibility per discriminator), а также агрегаторами (ESLint-like rule
 * "any field, any variant").
 *
 * Конфликт shape (один и тот же fieldName у двух variants с разным type) —
 * не разрешается; возвращается first-wins по declaration order.
 *
 * @param {object} entityDef
 * @returns {Record<string, object>}
 */
export function getUnionFields(entityDef) {
  const baseFields = getBaseFields(entityDef);
  if (!isPolymorphicEntity(entityDef)) return baseFields;
  const acc = { ...baseFields };
  for (const variant of Object.values(getEntityVariants(entityDef))) {
    const fields = normalizeFieldsObject(variant?.fields);
    for (const [name, def] of Object.entries(fields)) {
      if (!(name in acc)) acc[name] = def;
    }
  }
  return acc;
}

/**
 * Список fields, специфичных для конкретного variant'а (присутствуют в
 * variant.fields, но не в base entity.fields). Полезно для UI: показать
 * «появилось новое поле» при выборе variant'а.
 *
 * @param {object} entityDef
 * @param {string} discriminatorValue
 * @returns {string[]}
 */
export function getVariantSpecificFields(entityDef, discriminatorValue) {
  const variant = getEntityVariant(entityDef, discriminatorValue);
  if (!variant) return [];
  const baseFields = getBaseFields(entityDef);
  const variantFields = normalizeFieldsObject(variant.fields);
  return Object.keys(variantFields).filter((name) => !(name in baseFields));
}

/**
 * Валидация формата polymorphic entity. Возвращает { valid, errors[] }
 * с подробными причинами. Для non-polymorphic entity — { valid: true }.
 *
 * Проверки:
 *   - kind === "polymorphic" → discriminator должно быть string;
 *   - discriminator field должен быть в base entity.fields;
 *   - variants должно быть object;
 *   - каждый variant должен быть object с (опциональным) `fields` object'ом;
 *   - variant key (discriminator value) — non-empty string;
 *   - variants непустой.
 *
 * @param {object} entityDef
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePolymorphicEntity(entityDef) {
  const errors = [];
  if (!entityDef || typeof entityDef !== "object") {
    return { valid: false, errors: ["entity: must be an object"] };
  }
  if (!isPolymorphicEntity(entityDef)) {
    return { valid: true, errors: [] };
  }

  const discriminatorField = entityDef.discriminator;
  if (typeof discriminatorField !== "string" || !discriminatorField) {
    errors.push('polymorphic entity: discriminator must be non-empty string');
  }

  const baseFields = getBaseFields(entityDef);
  if (typeof discriminatorField === "string" && discriminatorField.length > 0) {
    if (!(discriminatorField in baseFields)) {
      errors.push(
        `polymorphic entity: discriminator "${discriminatorField}" must be declared in entity.fields (base fields)`,
      );
    }
  }

  const variants = entityDef.variants;
  if (!variants || typeof variants !== "object" || Array.isArray(variants)) {
    errors.push("polymorphic entity: variants must be an object");
  } else {
    const variantEntries = Object.entries(variants);
    if (variantEntries.length === 0) {
      errors.push("polymorphic entity: variants must contain at least one entry");
    }
    for (const [key, variant] of variantEntries) {
      if (!key) {
        errors.push("polymorphic entity: variant key must be non-empty string");
        continue;
      }
      if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
        errors.push(`polymorphic entity: variant "${key}" must be an object`);
        continue;
      }
      if (variant.fields !== undefined) {
        if (typeof variant.fields !== "object" || Array.isArray(variant.fields)) {
          errors.push(`polymorphic entity: variant "${key}".fields must be an object`);
        }
      }
      if (variant.invariants !== undefined && !Array.isArray(variant.invariants)) {
        errors.push(`polymorphic entity: variant "${key}".invariants must be an array if provided`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/* ------------------------- internal helpers ------------------------- */

function getBaseFields(entityDef) {
  return normalizeFieldsObject(entityDef?.fields);
}

function normalizeFieldsObject(fields) {
  if (!fields) return {};
  if (typeof fields === "object" && !Array.isArray(fields)) return fields;
  if (Array.isArray(fields)) {
    const obj = {};
    for (const name of fields) {
      if (typeof name === "string" && name) obj[name] = {};
    }
    return obj;
  }
  return {};
}
