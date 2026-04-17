/**
 * 5 signal-функций для UX Pattern Classifier.
 * Каждая: (intents[], ontology, projection, matchValue) → boolean
 *
 * Сигналы анализируют семантику intent-группы проекции и возвращают
 * boolean — совпал ли конкретный match-паттерн.
 */

import { inferFieldRole } from "../crystallize_v2/ontologyHelpers.js";

const BUY_SELL_PATTERNS = [
  ["buy", "sell"], ["add", "remove"], ["create", "delete"],
  ["deposit", "withdraw"], ["long", "short"],
];

const SYMMETRIC_PAIRS = {
  "accept-reject": [["accept", "reject"], ["approve", "decline"]],
  "ack-dismiss": [["acknowledge", "dismiss"], ["ack", "dismiss"], ["read", "hide"]],
  "pause-resume": [["pause", "resume"], ["suspend", "activate"], ["stop", "start"]],
};

/**
 * Анализирует форму действий (α) в группе намерений.
 * match: "bidirectional-trade" | "binary-decision" | "read-dominant" | "replace-dominant" | "crud"
 */
export function intentActionShape(intents, ontology, projection, match) {
  const ids = intents.map(i => i.id || "");
  const allEffects = intents.flatMap(i => i.particles?.effects || []);

  if (match === "bidirectional-trade") {
    return BUY_SELL_PATTERNS.some(([a, b]) =>
      ids.some(id => id.includes(a)) && ids.some(id => id.includes(b))
    );
  }

  if (match === "binary-decision") {
    // Два+ intent'а меняют одно и то же поле .status на разные значения
    const replaceStatusIntents = intents.filter(i => {
      const effs = i.particles?.effects || [];
      return effs.some(e => e.α === "replace" && typeof e.target === "string" && e.target.includes(".status") && e.value);
    });
    if (replaceStatusIntents.length >= 2) {
      const targets = replaceStatusIntents.map(i =>
        i.particles.effects.find(e => e.target?.includes(".status")).target
      );
      if (new Set(targets).size === 1) return true;
    }
    // Или naming pattern: accept/reject, ack/dismiss etc.
    return Object.values(SYMMETRIC_PAIRS).some(pairs =>
      pairs.some(([a, b]) => ids.some(id => id.includes(a)) && ids.some(id => id.includes(b)))
    );
  }

  if (match === "read-dominant") {
    const withEffects = intents.filter(i => (i.particles?.effects || []).length > 0);
    return intents.length > 0 && withEffects.length / intents.length < 0.3;
  }

  if (match === "replace-dominant") {
    const replaces = allEffects.filter(e => e.α === "replace");
    return allEffects.length > 0 && replaces.length / allEffects.length > 0.7;
  }

  if (match === "crud") {
    const actions = new Set(allEffects.map(e => e.α));
    return actions.has("add") && (actions.has("replace") || actions.has("remove"));
  }

  return false;
}

/**
 * Проверяет наличие кластера семантических ролей полей в сущностях intent-группы.
 * match: string[] — все роли должны присутствовать.
 */
export function fieldRoleCluster(intents, ontology, projection, requiredRoles) {
  if (!ontology?.entities) return false;
  const presentRoles = new Set();

  const entityNames = new Set();
  for (const intent of intents) {
    for (const e of intent.particles?.entities || []) {
      entityNames.add(e.split(":").pop().trim().replace(/\[\]$/, ""));
    }
  }
  if (projection?.mainEntity) entityNames.add(projection.mainEntity);

  for (const entityName of entityNames) {
    const entity = ontology.entities[entityName];
    if (!entity?.fields) continue;
    const fields = typeof entity.fields === "object" && !Array.isArray(entity.fields)
      ? Object.entries(entity.fields) : [];
    for (const [name, def] of fields) {
      const roleInfo = inferFieldRole(name, def);
      if (roleInfo?.role) presentRoles.add(roleInfo.role);
      if (def?.fieldRole) presentRoles.add(def.fieldRole);
      if (def?.type === "ticker") presentRoles.add("ticker");
      // Name-based semantic roles не покрытые inferFieldRole
      if (/^(quantity|qty|count|amount)$/i.test(name) && def?.type === "number") {
        presentRoles.add("quantity");
      }
    }
  }

  return requiredRoles.every(r => presentRoles.has(r));
}

/**
 * Анализирует топологию сущностей в онтологии.
 * match: "has-reference-asset" | "has-preapproval" | "has-assignment-m2m"
 */
export function entityTopology(intents, ontology, projection, match) {
  if (match === "has-reference-asset") {
    if (!ontology?.entities) return false;
    return Object.values(ontology.entities).some(e => e.kind === "reference");
  }

  if (match === "has-preapproval") {
    if (!ontology?.roles) return false;
    return Object.values(ontology.roles).some(r => r.preapproval);
  }

  if (match === "has-assignment-m2m") {
    if (!ontology?.roles) return false;
    return Object.values(ontology.roles).some(r =>
      r.scope && Object.values(r.scope).some(s => s.via)
    );
  }

  return false;
}

/**
 * Ищет антагонистические пары намерений по naming convention.
 * match: "accept-reject" | "ack-dismiss" | "pause-resume"
 */
export function intentPairSymmetry(intents, ontology, projection, match) {
  const pairs = SYMMETRIC_PAIRS[match];
  if (!pairs) return false;
  const ids = intents.map(i => (i.id || "").toLowerCase());
  return pairs.some(([a, b]) =>
    ids.some(id => id.includes(a)) && ids.some(id => id.includes(b))
  );
}

/**
 * Соотношение write-интентов (с эффектами) к общему количеству.
 * match: "write-sparse" (<30%) | "write-dense" (>70%) | "balanced" (30-70%)
 */
export function effectDensity(intents, ontology, projection, match) {
  if (intents.length === 0) return false;
  const withEffects = intents.filter(i => (i.particles?.effects || []).length > 0);
  const ratio = withEffects.length / intents.length;

  if (match === "write-sparse") return ratio <= 0.3;
  if (match === "write-dense") return ratio > 0.7;
  if (match === "balanced") return ratio > 0.3 && ratio <= 0.7;
  return false;
}
