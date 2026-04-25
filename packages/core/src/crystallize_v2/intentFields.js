/**
 * intentReadFields / intentWriteFields — чистые extractor'ы для IB-фильтра.
 *
 * intentReadFields: какие поля сущности E читает intent через conditions.
 * intentWriteFields: какие поля сущности E пишет intent через effects.
 */

const splitDotted = (s) => String(s || "").split(".");

/**
 * Возвращает поля сущности entityName, упомянутые в conditions[] intent'а.
 * Формат conditions[].field: "EntityName.fieldName"
 */
export function intentReadFields(intent, entityName) {
  const conditions = intent?.particles?.conditions || [];
  const fields = new Set();
  for (const cond of conditions) {
    const [ent, field] = splitDotted(cond.field);
    if (ent === entityName && field) fields.add(field);
  }
  return [...fields];
}

/**
 * Возвращает поля сущности entityName, записываемые intent'ом через effects[].
 *
 * Поддерживает:
 * - dotted target: "Entity.field" → field
 * - α:"create" с entity target + payload → ключи payload
 * - α:"create" с entity target без payload → пустой массив
 */
export function intentWriteFields(intent, entityName) {
  const effects = intent?.particles?.effects || [];
  const fields = new Set();
  for (const eff of effects) {
    const [ent, field] = splitDotted(eff.target);
    if (ent !== entityName) continue;
    if (field) {
      fields.add(field);
    } else if (eff.α === "create" && eff.payload && typeof eff.payload === "object") {
      for (const k of Object.keys(eff.payload)) fields.add(k);
    }
  }
  return [...fields];
}
