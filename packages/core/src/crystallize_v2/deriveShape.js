/**
 * deriveShape — вывод визуального «shape» поверх archetype=catalog|feed.
 * Работает ортогонально Pattern Bank: shape — про форму данных во
 * времени/пространстве, pattern — про поведенческую природу задачи.
 *
 * shape: "default" | "timeline" | "directory"
 *
 * Правила:
 * - author-override (projection.shape) выигрывает безусловно
 * - timeline: date-witness + descending sort (sort начинается с "-")
 *   ИЛИ явная сортировка по date-полю
 * - directory: contact-поля (phone|email|address) в witnesses, нет sort-by-date
 * - default: fallback
 */

const DATE_FIELD_HINTS = new Set([
  "date",
  "createdAt",
  "updatedAt",
  "recordDate",
  "administeredDate",
  "eventDate",
  "startDate",
  "scheduledAt",
  "visitDate",
  "dueDate",
  "birthDate",
]);
const CONTACT_FIELD_HINTS = new Set(["phone", "email", "address"]);

function isDateField(fieldName, fieldDef) {
  if (fieldDef?.type === "date" || fieldDef?.type === "datetime") return true;
  if (DATE_FIELD_HINTS.has(fieldName)) return true;
  return fieldName.endsWith("At") || fieldName.endsWith("Date");
}

function isContactField(fieldName) {
  return CONTACT_FIELD_HINTS.has(fieldName);
}

function witnessFields(projection) {
  return (projection.witnesses || [])
    .map(w => (typeof w === "string" ? w : w.field))
    .filter(Boolean);
}

/**
 * @param {object} projection
 * @param {object} ontology
 * @returns {{ shape: "default" | "timeline" | "directory", signals: string[] }}
 */
export function deriveShape(projection, ontology) {
  if (projection.shape) {
    return { shape: projection.shape, signals: ["author-override"] };
  }

  if (projection.kind !== "catalog" && projection.kind !== "feed") {
    return { shape: "default", signals: [] };
  }

  const mainEntity = projection.mainEntity;
  const entity = ontology?.entities?.[mainEntity];
  const fields = entity?.fields || {};
  const fieldsObj = Array.isArray(fields)
    ? Object.fromEntries(fields.map(f => [f, {}]))
    : fields;
  const witnesses = witnessFields(projection);

  const signals = [];
  const sort = projection.sort || "";
  const hasDescendingSort = typeof sort === "string" && sort.startsWith("-");
  const sortField = sort.replace(/^-/, "");
  const sortsByDate = sortField && isDateField(sortField, fieldsObj[sortField]);

  const dateWitness = witnesses.find(w => isDateField(w, fieldsObj[w]));
  if (dateWitness && (hasDescendingSort || sortsByDate)) {
    signals.push(`date-witness:${dateWitness}`);
    if (hasDescendingSort) signals.push("descending-sort");
    if (sortsByDate) signals.push(`sort-by-date:${sortField}`);
    return { shape: "timeline", signals };
  }

  const contactWitness = witnesses.find(w => isContactField(w));
  if (contactWitness && !sortsByDate) {
    signals.push(`contact-field:${contactWitness}`);
    return { shape: "directory", signals };
  }

  return { shape: "default", signals };
}
