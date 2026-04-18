/**
 * buildTemporalRenderSpec — резолвит спецификацию rendering'а для детальной
 * sub-секции с `entity.temporality` ∈ {"snapshot", "causal-chain"}.
 *
 * Возвращает объект, который записывается в section.renderAs и потребляется
 * рендерером (EventTimeline primitive).
 *
 * Priority atField: occurred > timestamp > scheduled > first datetime.
 */

import { inferFieldRole } from "./ontologyHelpers.js";

const TEMPORAL_ROLES_PRIORITY = ["occurred", "timestamp", "scheduled"];
const ACTOR_NAME_RE = /^(actor|performedBy|createdBy|updatedBy|deletedBy)$|by$/i;
const DESCRIPTION_NAME_RE = /^(description|reason|notes|message|comment|text)$/i;

function fieldsObj(entity) {
  const f = entity?.fields || {};
  if (Array.isArray(f)) return Object.fromEntries(f.map(n => [n, {}]));
  return f;
}

function resolveAtField(fo) {
  const byRole = {};
  for (const [name, def] of Object.entries(fo)) {
    const role = inferFieldRole(name, def)?.role;
    if (role && TEMPORAL_ROLES_PRIORITY.includes(role)) {
      if (!byRole[role]) byRole[role] = name;
    }
  }
  for (const role of TEMPORAL_ROLES_PRIORITY) {
    if (byRole[role]) return byRole[role];
  }
  for (const [name, def] of Object.entries(fo)) {
    if (def?.type === "datetime" || def?.type === "date") return name;
  }
  return null;
}

function resolveKindField(fo) {
  for (const [name, def] of Object.entries(fo)) {
    if (def?.type === "enum") return name;
  }
  return null;
}

function resolveActorField(fo) {
  for (const [name, def] of Object.entries(fo)) {
    if (def?.type === "entityRef" && ACTOR_NAME_RE.test(name)) return name;
  }
  return null;
}

function resolveDescriptionField(fo) {
  for (const [name, def] of Object.entries(fo)) {
    if (DESCRIPTION_NAME_RE.test(name) &&
        (def?.type === "text" || def?.type === "textarea" || !def?.type)) {
      return name;
    }
  }
  return null;
}

function resolveStateFields(fo, atField, fkField) {
  return Object.keys(fo).filter(name => {
    if (name === "id") return false;
    if (name === atField) return false;
    if (name === fkField) return false;
    if (name.endsWith("Id")) return false;
    return true;
  });
}

/**
 * @param {"snapshot"|"causal-chain"} temporality
 * @param {string} entityName
 * @param {object} ontology
 * @returns {object} renderAs spec
 */
export function buildTemporalRenderSpec(temporality, entityName, ontology) {
  const entity = ontology?.entities?.[entityName];
  const fo = fieldsObj(entity);
  const atField = resolveAtField(fo);

  if (temporality === "snapshot") {
    const fk = entity?.ownerField || null;
    const stateFields = resolveStateFields(fo, atField, fk);
    return { type: "eventTimeline", kind: "snapshot", atField, stateFields };
  }

  return {
    type: "eventTimeline",
    kind: "causal-chain",
    atField,
    kindField: resolveKindField(fo),
    actorField: resolveActorField(fo),
    descriptionField: resolveDescriptionField(fo),
  };
}
