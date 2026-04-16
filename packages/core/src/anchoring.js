/**
 * Анкеринг частиц намерения к онтологии (§15).
 *
 * Конструктивные частицы (entities, effect.target base) → error → блок crystallize.
 * Описательные частицы (field, witness, condition) → warning/info → не блокируют.
 *
 * @module anchoring
 */

function normalizeFieldNames(entity) {
  const f = entity?.fields;
  if (Array.isArray(f)) return new Set(f);
  if (f && typeof f === "object") return new Set(Object.keys(f));
  return new Set();
}

export function checkAnchoring(INTENTS, ONTOLOGY) {
  const errors = [];
  const warnings = [];
  const infos = [];

  const entities = ONTOLOGY?.entities || {};
  const systemCollections = new Set(ONTOLOGY?.systemCollections || []);
  const knownEntityNames = new Set(Object.keys(entities).map(e => e.toLowerCase()));

  for (const [id, intent] of Object.entries(INTENTS)) {
    const particles = intent.particles || {};

    for (const entityStr of (particles.entities || [])) {
      const typeName = entityStr
        .split(":").pop().trim()
        .replace(/\(.*\)/, "")
        .replace(/\[\]/, "")
        .toLowerCase();
      const singular = typeName.endsWith("s") ? typeName.slice(0, -1) : typeName;
      const anchored =
        knownEntityNames.has(typeName) ||
        knownEntityNames.has(singular) ||
        systemCollections.has(typeName) ||
        systemCollections.has(singular);
      if (!anchored) {
        errors.push({
          rule: "anchoring_entity",
          level: "error",
          intent: id,
          particle: { kind: "entity", value: entityStr },
          message: `Entity "${entityStr}" не найдена в ontology.entities (intent "${id}")`,
          detail: `Добавьте сущность в ontology.entities, либо декларируйте "${typeName}" в ontology.systemCollections, если это системная коллекция без доменной сущности.`,
        });
      }
    }
  }

  return {
    errors,
    warnings,
    infos,
    passed: errors.length === 0,
  };
}
