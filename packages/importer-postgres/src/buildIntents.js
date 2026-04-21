/**
 * Генерирует 5 seed CRUD intents на entity в IDF-native формате.
 *
 * Каждый intent имеет:
 *   - legacy-плоские поля (target / alpha / parameters) для effect-runner-http
 *   - native-поля (creates / particles.effects / particles.confirmation) для deriveProjections
 *
 * Это даёт "дважды corрект" output: import-generated ontology кристаллизуется
 * через crystallize_v2 → materializer'ы работают без ручных authored projection'ов.
 */
export function buildIntents(entity) {
  const writableFields = Object.entries(entity.fields).filter(
    ([, f]) => !f.readOnly
  );
  const writableParams = {};
  for (const [name, f] of writableFields) {
    writableParams[name] = { type: f.type };
  }

  const updateParams = { id: { type: "string", required: true } };
  for (const [name, f] of writableFields) {
    updateParams[name] = { type: f.type };
  }

  return {
    [`create${entity.name}`]: {
      target: entity.name,
      alpha: "insert",
      creates: entity.name,
      parameters: writableParams,
      particles: {
        confirmation: "enter",
        effects: [{ target: entity.name, op: "insert" }],
      },
    },
    [`update${entity.name}`]: {
      target: entity.name,
      alpha: "replace",
      parameters: updateParams,
      particles: {
        effects: [{ target: entity.name, op: "replace" }],
      },
    },
    [`remove${entity.name}`]: {
      target: entity.name,
      alpha: "remove",
      parameters: { id: { type: "string", required: true } },
      particles: {
        effects: [{ target: entity.name, op: "remove" }],
      },
    },
    [`list${entity.name}`]: {
      target: entity.name,
      parameters: {},
    },
    [`read${entity.name}`]: {
      target: entity.name,
      parameters: { id: { type: "string", required: true } },
    },
  };
}
