import { parsePrisma } from "./parsePrisma.js";
import { modelToEntity } from "./modelToEntity.js";
import { buildRelations } from "./buildRelations.js";

export { parsePrisma, modelToEntity, buildRelations };

/**
 * Prisma schema source → IDF ontology (с seed CRUD intents).
 */
export function importPrisma(source, opts = {}) {
  const { models } = parsePrisma(source);
  const modelNames = new Set(models.map((m) => m.name));

  const entities = {};
  for (const model of models) {
    entities[model.name] = modelToEntity(model, modelNames);
  }

  buildRelations(entities, models);

  const intents = buildSeedIntents(entities);

  return {
    name: opts.name ?? "default",
    entities,
    intents,
    roles: { owner: { base: "owner" } },
  };
}

function buildSeedIntents(entities) {
  const intents = {};
  for (const entity of Object.values(entities)) {
    const writable = Object.entries(entity.fields).filter(([, f]) => !f.readOnly);
    const createParams = {};
    for (const [name, f] of writable) createParams[name] = { type: f.type };

    const updateParams = { id: { type: "string", required: true } };
    for (const [name, f] of writable) updateParams[name] = { type: f.type };

    intents[`create${entity.name}`] = { target: entity.name, alpha: "insert", parameters: createParams };
    intents[`update${entity.name}`] = { target: entity.name, alpha: "replace", parameters: updateParams };
    intents[`remove${entity.name}`] = { target: entity.name, alpha: "remove", parameters: { id: { type: "string", required: true } } };
    intents[`list${entity.name}`] = { target: entity.name, parameters: {} };
    intents[`read${entity.name}`] = { target: entity.name, parameters: { id: { type: "string", required: true } } };
  }
  return intents;
}
