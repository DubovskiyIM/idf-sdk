import { resolveRef } from "./resolveRef.js";
import { schemaToEntity, propertyToField } from "./schemaToEntity.js";
import { pathToIntent, entityNameFromPath } from "./pathToIntent.js";
import { parse as parseYaml } from "yaml";

export { resolveRef, schemaToEntity, propertyToField, pathToIntent, entityNameFromPath };

export function parseSpec(source) {
  if (typeof source !== "string") return source;
  const trimmed = source.trim();
  if (trimmed.startsWith("{")) return JSON.parse(source);
  return parseYaml(source);
}

const METHODS = ["get", "post", "put", "patch", "delete"];

export function importOpenApi(spec, opts = {}) {
  const entities = {};
  const intents = {};

  // 1) entities из components.schemas
  const schemas = spec.components?.schemas ?? {};
  for (const [name, schema] of Object.entries(schemas)) {
    const resolved = schema.$ref ? resolveRef(schema, spec) : schema;
    const entity = schemaToEntity(name, resolved);
    if (entity) entities[name] = entity;
  }

  // 2) intents из paths
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of METHODS) {
      const op = pathItem[method];
      if (!op) continue;
      const { name, intent } = pathToIntent(method, path, op);
      intents[name] = intent;

      // Гарантируем что entity есть (из path, если не было в components)
      if (!entities[intent.target]) {
        entities[intent.target] = {
          name: intent.target,
          kind: "internal",
          fields: { id: { type: "string", readOnly: true } },
        };
      }
    }
  }

  return {
    name: opts.name ?? "default",
    entities,
    intents,
    roles: { owner: { base: "owner" } },
  };
}
