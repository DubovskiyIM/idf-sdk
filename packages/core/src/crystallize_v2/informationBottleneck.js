/**
 * applyInformationBottleneck — IB-фильтр uiSchema.
 *
 * Поле сущности E входит в uiSchema проекции P для роли R ⟺
 * существует accessible intent I такой что поле упомянуто в conditions[]
 * (read) или в effects[].target (write).
 *
 * Author override через projection.uiSchema.{include,exclude}Fields.
 * Witness фиксируется для CrystallizeInspector.
 */
import { accessibleIntents } from "./accessibleIntents.js";
import { intentReadFields, intentWriteFields } from "./intentFields.js";

/**
 * @param {{ projection, role, INTENTS, ONTOLOGY }} opts
 * @returns {{ fields: string[], witness: object }}
 */
export function applyInformationBottleneck({ projection, role, INTENTS, ONTOLOGY }) {
  const mainEntity = projection?.mainEntity;
  const rawFields = ONTOLOGY?.entities?.[mainEntity]?.fields;

  // Поддержка обоих форматов fields: массив строк (старый) или объект (новый).
  // Массив — legacy-формат без метаданных, IB не применяется (no-op).
  // Если поле-словарь не определено или пустое — IB не применяется.
  let allFields;
  if (Array.isArray(rawFields)) {
    // Старый формат: ["id", "name", ...] — IB пропускается (нет canonicalType/fieldRole).
    allFields = [];
  } else if (rawFields && typeof rawFields === "object") {
    allFields = Object.keys(rawFields);
  } else {
    allFields = [];
  }

  const intents = accessibleIntents(projection, role, INTENTS, ONTOLOGY);

  // Guard: если нет полей (или legacy-массив) — IB не фильтрует (null → buildDetailBody использует все).
  const includeOverride = new Set(projection?.uiSchema?.includeFields || []);
  const excludeOverride = new Set(projection?.uiSchema?.excludeFields || []);

  if (allFields.length === 0) {
    return {
      fields: null,
      witness: {
        basis: "information-bottleneck",
        reliability: "rule-based",
        projection: projection?.id,
        role,
        accessibleIntentIds: intents.map((i) => i.id),
        included: [],
        excluded: [],
        skipped: true,
        reason: "no-fields-in-ontology",
        overrides: { include: [...includeOverride], exclude: [...excludeOverride] },
      },
    };
  }

  // Guard: если нет доступных intent'ов — IB не фильтрует.
  if (intents.length === 0) {
    return {
      fields: null,
      witness: {
        basis: "information-bottleneck",
        reliability: "rule-based",
        projection: projection?.id,
        role,
        accessibleIntentIds: [],
        included: [],
        excluded: [],
        skipped: true,
        reason: "no-accessible-intents",
        overrides: { include: [...includeOverride], exclude: [...excludeOverride] },
      },
    };
  }

  const touched = new Set();
  for (const intent of intents) {
    for (const f of intentReadFields(intent, mainEntity)) touched.add(f);
    for (const f of intentWriteFields(intent, mainEntity)) touched.add(f);
  }

  const fields = allFields.filter((f) => {
    if (excludeOverride.has(f)) return false;
    if (includeOverride.has(f)) return true;
    return touched.has(f);
  });
  const excluded = allFields.filter((f) => !fields.includes(f));
  const witness = {
    basis: "information-bottleneck",
    reliability: "rule-based",
    projection: projection?.id,
    role,
    accessibleIntentIds: intents.map((i) => i.id),
    included: fields,
    excluded,
    overrides: {
      include: [...includeOverride],
      exclude: [...excludeOverride],
    },
  };
  return { fields, witness };
}
