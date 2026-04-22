import { resolveRef } from "./resolveRef.js";
import { schemaToEntity, propertyToField } from "./schemaToEntity.js";
import { pathToIntent, entityNameFromPath } from "./pathToIntent.js";
import { extractParentChain, extractCollectionChain, synthesizeFkField } from "./extractParentChain.js";
import { parse as parseYaml } from "yaml";

export {
  resolveRef, schemaToEntity, propertyToField, pathToIntent, entityNameFromPath,
  extractParentChain, extractCollectionChain, synthesizeFkField,
};

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

  // 3) path-derived foreign keys: для nested-path REST API (Gravitino,
  //    K8s, AWS REST) синтезируем FK на child → parent чтобы активировать
  //    hierarchy-tree-nav pattern и R8 hub-absorption. Иначе эти апи
  //    после import'а — flat, родителей нет, tree-nav пустой.
  //
  //    Пример: /metalakes/{m}/catalogs → Catalog.metalakeId (ref → Metalake).
  //    Идемпотентно: не перезаписывает существующие поля.
  for (const path of Object.keys(spec.paths ?? {})) {
    const { entity, parent } = extractParentChain(path);
    if (!entity || !parent || !entities[entity]) continue;
    // Parent entity должен существовать (иначе FK ссылается в пустоту).
    if (!entities[parent.entity]) continue;
    synthesizeFkField(entities[entity], parent);
  }

  return {
    name: opts.name ?? "default",
    entities,
    intents,
    roles: { owner: { base: "owner" } },
  };
}
