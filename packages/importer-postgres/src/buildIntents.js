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
      parameters: writableParams,
    },
    [`update${entity.name}`]: {
      target: entity.name,
      alpha: "replace",
      parameters: updateParams,
    },
    [`remove${entity.name}`]: {
      target: entity.name,
      alpha: "remove",
      parameters: { id: { type: "string", required: true } },
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
