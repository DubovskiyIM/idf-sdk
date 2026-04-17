/**
 * Валидация формата паттерна и evaluation trigger-условий.
 *
 * validatePattern(pattern) — throws при невалидном формате.
 * evaluateTrigger(trigger, intents, ontology, projection) → boolean
 */

import { inferFieldRole } from "../crystallize_v2/ontologyHelpers.js";

const VALID_KINDS = new Set([
  "entity-field", "intent-effect", "intent-creates", "entity-kind",
  "has-role", "field-role-present", "sub-entity-exists",
  "intent-confirmation", "intent-count",
]);

/**
 * Валидировать формат паттерна. Throws при ошибке.
 */
export function validatePattern(pattern) {
  if (!pattern?.id) throw new Error("Pattern missing required field: id");
  if (!pattern.version) throw new Error(`Pattern ${pattern.id}: missing version`);
  if (!pattern.status) throw new Error(`Pattern ${pattern.id}: missing status`);
  if (!pattern.trigger?.requires || !Array.isArray(pattern.trigger.requires)) {
    throw new Error(`Pattern ${pattern.id}: missing trigger.requires array`);
  }
  for (const req of pattern.trigger.requires) {
    if (!VALID_KINDS.has(req.kind)) {
      throw new Error(`Pattern ${pattern.id}: unknown trigger kind "${req.kind}"`);
    }
  }
  if (!pattern.structure) throw new Error(`Pattern ${pattern.id}: missing structure`);
  if (!pattern.rationale) throw new Error(`Pattern ${pattern.id}: missing rationale`);
  if (!pattern.falsification) throw new Error(`Pattern ${pattern.id}: missing falsification`);
  if (!pattern.falsification.shouldMatch?.length) {
    throw new Error(`Pattern ${pattern.id}: falsification.shouldMatch must be non-empty`);
  }
  if (!pattern.falsification.shouldNotMatch?.length) {
    throw new Error(`Pattern ${pattern.id}: falsification.shouldNotMatch must be non-empty`);
  }
}

/**
 * Evaluate trigger условия. Все requires — AND. match() вызывается после requires.
 */
export function evaluateTrigger(trigger, intents, ontology, projection) {
  const mainEntity = projection?.mainEntity;

  for (const req of trigger.requires || []) {
    if (!evaluateRequirement(req, intents, ontology, mainEntity)) return false;
  }

  if (typeof trigger.match === "function") {
    return trigger.match(intents, ontology, projection);
  }

  return true;
}

function resolveVar(value, mainEntity) {
  if (value === "$mainEntity") return mainEntity;
  return value;
}

function getEntityFields(ontology, entityName) {
  const entity = ontology?.entities?.[entityName];
  if (!entity?.fields) return {};
  if (typeof entity.fields === "object" && !Array.isArray(entity.fields)) return entity.fields;
  const obj = {};
  for (const f of entity.fields) obj[f] = {};
  return obj;
}

function evaluateRequirement(req, intents, ontology, mainEntity) {
  switch (req.kind) {
    case "entity-field": {
      const fields = getEntityFields(ontology, mainEntity);
      const field = fields[req.field];
      if (!field) return false;
      if (req.type) {
        const fieldType = field.type || "text";
        if (fieldType !== req.type) return false;
      }
      if (req.minOptions) {
        const options = field.options ||
          ontology?.entities?.[mainEntity]?.statuses || [];
        if (options.length < req.minOptions) return false;
      }
      return true;
    }

    case "intent-effect": {
      return intents.some(intent => {
        const effects = intent.particles?.effects || [];
        return effects.some(e => {
          if (req.α && e.α !== req.α) return false;
          if (req.targetSuffix && typeof e.target === "string" && !e.target.endsWith(req.targetSuffix)) return false;
          if (req.irreversibility) {
            const irr = intent.irreversibility || "low";
            if (Array.isArray(req.irreversibility) && !req.irreversibility.includes(irr)) return false;
          }
          return true;
        });
      });
    }

    case "intent-creates": {
      const target = resolveVar(req.entity, mainEntity);
      return intents.some(intent => {
        const creates = intent.creates;
        if (!creates) return false;
        const normalized = creates.replace(/\(.*\)$/, "").trim();
        return normalized === target;
      });
    }

    case "entity-kind": {
      const entity = ontology?.entities?.[mainEntity];
      return entity?.kind === req.entityKind;
    }

    case "has-role": {
      if (!ontology?.roles) return false;
      return Object.values(ontology.roles).some(r => r.base === req.roleBase);
    }

    case "field-role-present": {
      const fields = getEntityFields(ontology, mainEntity);
      return Object.entries(fields).some(([name, def]) => {
        if (def?.fieldRole === req.fieldRole) return true;
        const inferred = inferFieldRole(name, def || {});
        return inferred?.role === req.fieldRole;
      });
    }

    case "sub-entity-exists": {
      const target = resolveVar(req.foreignKeyTo, mainEntity);
      if (!target || !ontology?.entities) return false;
      const fkName = target.toLowerCase() + "Id";
      return Object.entries(ontology.entities).some(([name, entity]) => {
        if (name === target) return false;
        const fields = getEntityFields(ontology, name);
        return fkName in fields;
      });
    }

    case "intent-confirmation": {
      return intents.some(i => i.particles?.confirmation === req.confirmation);
    }

    case "intent-count": {
      const matching = intents.filter(intent => {
        const effects = intent.particles?.effects || [];
        return effects.some(e => {
          if (req.α && e.α !== req.α) return false;
          if (req.targetSuffix && !e.target?.endsWith(req.targetSuffix)) return false;
          return true;
        });
      });
      if (req.min && matching.length < req.min) return false;
      return matching.length > 0;
    }

    default:
      return false;
  }
}
