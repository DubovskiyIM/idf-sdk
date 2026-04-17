// subEntityHelpers.js
//
// Helpers для обнаружения sub-entities и построения section-дескрипторов
// для паттерна detail/subcollections (structure.apply).
//
// Логика:
//   - findSubEntities(ontology, mainEntity) — находит дочерние сущности по foreignKey
//     или по соглашению <mainLower>Id. Возвращает массив { entity, fkField },
//     отсортированный алфавитно по entity.
//   - sectionIdFor(entity) — "Position" → "positions".
//   - buildSection(entity, fkField, intents, ontology) — строит section descriptor
//     с отфильтрованными по sub-entity интентами и layout (list | m2m).

/**
 * Find sub-entities: entities whose fields reference mainEntity via foreignKey.
 * Also supports convention-based discovery (field name "<mainLower>Id").
 * Result ordered alphabetically by entity name.
 */
export function findSubEntities(ontology, mainEntity) {
  if (!ontology?.entities || !mainEntity) return [];
  const lowerMain = mainEntity.toLowerCase();
  const fkConvention = lowerMain + "Id";
  const result = [];
  for (const [entityName, entity] of Object.entries(ontology.entities)) {
    if (entityName === mainEntity) continue;
    const fields = normalizeFields(entity.fields);
    for (const [fieldName, def] of Object.entries(fields)) {
      const isExplicitFk = def?.type === "foreignKey" && def.refs === mainEntity;
      const isConventionFk = fieldName === fkConvention;
      if (isExplicitFk || isConventionFk) {
        result.push({ entity: entityName, fkField: fieldName });
        break;
      }
    }
  }
  return result.sort((a, b) => a.entity.localeCompare(b.entity));
}

function normalizeFields(fields) {
  if (!fields) return {};
  if (Array.isArray(fields)) {
    const out = {};
    for (const f of fields) out[f] = {};
    return out;
  }
  return fields;
}

export function sectionIdFor(entity) {
  return entity.toLowerCase() + "s";
}

/**
 * Build section descriptor for sub-entity.
 * Collects intents that create/modify/remove the sub-entity.
 */
export function buildSection(entity, fkField, intents, ontology) {
  const entityLower = entity.toLowerCase();
  const relevantIntents = (intents || [])
    .filter(intent => {
      if (intent.creates && stripCreatesArgs(intent.creates) === entity) return true;
      const effects = intent.particles?.effects || [];
      return effects.some(e => {
        if (typeof e.target !== "string") return false;
        return e.target === entityLower || e.target.startsWith(entityLower + ".");
      });
    })
    .map(i => i.id);

  const entityDef = ontology?.entities?.[entity];
  const layout = entityDef?.kind === "assignment" ? "m2m" : "list";

  return {
    id: sectionIdFor(entity),
    entity,
    foreignKey: fkField,
    layout,
    intents: relevantIntents,
    source: "derived:subcollections",
  };
}

function stripCreatesArgs(creates) {
  return (creates || "").replace(/\(.*\)$/, "").trim();
}
