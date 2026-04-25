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
  const allFields = Object.keys(ONTOLOGY?.entities?.[mainEntity]?.fields || {});
  const intents = accessibleIntents(projection, role, INTENTS, ONTOLOGY);
  const touched = new Set();
  for (const intent of intents) {
    for (const f of intentReadFields(intent, mainEntity)) touched.add(f);
    for (const f of intentWriteFields(intent, mainEntity)) touched.add(f);
  }
  const includeOverride = new Set(projection?.uiSchema?.includeFields || []);
  const excludeOverride = new Set(projection?.uiSchema?.excludeFields || []);
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
