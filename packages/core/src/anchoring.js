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

    for (const ef of (particles.effects || [])) {
      const target = ef.target || "";
      if (!target) continue;
      const [base, ...fieldParts] = target.split(".");
      const baseLower = base.toLowerCase();
      const singular = baseLower.endsWith("s") ? baseLower.slice(0, -1) : baseLower;
      const isSystem = systemCollections.has(baseLower) || systemCollections.has(singular);
      const baseAnchored =
        knownEntityNames.has(baseLower) ||
        knownEntityNames.has(singular) ||
        isSystem;

      if (!baseAnchored) {
        errors.push({
          rule: "anchoring_effect_target",
          level: "error",
          intent: id,
          particle: { kind: "effect.target", value: target },
          message: `Effect target "${target}" не анкерирован (intent "${id}")`,
          detail: `Коллекция "${base}" не соответствует ни одной сущности в ontology.entities. Проверьте plural-резолвинг ("${base}" → "${singular}"), добавьте сущность или декларируйте в ontology.systemCollections.`,
        });
        continue;
      }

      if (fieldParts.length > 0 && !isSystem) {
        const field = fieldParts.join(".");
        const entityKey = Object.keys(entities).find(e =>
          e.toLowerCase() === baseLower || e.toLowerCase() === singular
        );
        if (entityKey) {
          const entityFields = normalizeFieldNames(entities[entityKey]);
          if (!entityFields.has(field) && field !== "status") {
            warnings.push({
              rule: "anchoring_effect_field",
              level: "warning",
              intent: id,
              particle: { kind: "field", value: target },
              message: `Поле "${field}" не объявлено в ${entityKey} (intent "${id}")`,
              detail: `Effect target "${target}": поле "${field}" не в ontology.entities.${entityKey}.fields. Добавьте поле в онтологию, либо оставьте как описательную подсказку.`,
            });
          }
        }
      }
    }

    for (const w of (particles.witnesses || [])) {
      if (typeof w !== "string" || !w.includes(".") || w.includes("(")) continue;
      const [entityLower, ...fieldParts] = w.split(".");
      const field = fieldParts.join(".");
      const entityKey = Object.keys(entities).find(e => e.toLowerCase() === entityLower.toLowerCase());
      if (!entityKey) continue;
      const fields = normalizeFieldNames(entities[entityKey]);
      if (!fields.has(field) && field !== "status") {
        infos.push({
          rule: "anchoring_witness",
          level: "info",
          intent: id,
          particle: { kind: "witness", value: w },
          message: `Witness "${w}" — поле "${field}" не в ${entityKey} (intent "${id}")`,
          detail: `Свидетельство ссылается на поле, которого нет в онтологии. Добавьте поле либо скорректируйте witness.`,
        });
      }
    }

    for (const cond of (particles.conditions || [])) {
      if (typeof cond !== "string") continue;
      const match = cond.match(/^(\w+)\.(\w+)/);
      if (!match) continue;
      const [, entityLower, field] = match;
      const entityKey = Object.keys(entities).find(e => e.toLowerCase() === entityLower.toLowerCase());
      if (!entityKey) continue;
      const fields = normalizeFieldNames(entities[entityKey]);
      if (!fields.has(field) && field !== "status") {
        infos.push({
          rule: "anchoring_condition",
          level: "info",
          intent: id,
          particle: { kind: "condition", value: cond },
          message: `Condition "${cond}" — поле "${field}" не в ${entityKey} (intent "${id}")`,
          detail: `Предикат ссылается на поле, которого нет в онтологии.`,
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
