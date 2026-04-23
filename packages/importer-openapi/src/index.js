import { resolveRef } from "./resolveRef.js";
import { flattenSchema } from "./flattenSchema.js";
import { schemaToEntity, propertyToField } from "./schemaToEntity.js";
import { pathToIntent, entityNameFromPath, detectActionEndpoint } from "./pathToIntent.js";
import { extractParentChain, extractCollectionChain, synthesizeFkField } from "./extractParentChain.js";
import {
  mergeRepresentationDuplicates,
  rewriteReferencesByAliases,
  rewriteIntentTargetsByAliases,
} from "./mergeRepresentationDuplicates.js";
import { markEmbeddedTypes } from "./markEmbeddedTypes.js";
import { parse as parseYaml } from "yaml";

export {
  resolveRef, flattenSchema,
  schemaToEntity, propertyToField, pathToIntent, entityNameFromPath,
  detectActionEndpoint,
  extractParentChain, extractCollectionChain, synthesizeFkField,
  mergeRepresentationDuplicates,
  rewriteReferencesByAliases,
  rewriteIntentTargetsByAliases,
  markEmbeddedTypes,
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

  // 1) entities из components.schemas.
  //    flattenSchema резолвит $ref + сливает allOf/oneOf/anyOf
  //    композиции — закрывает Gravitino G32 (PolicyBase +
  //    CustomPolicy allOf + Policy oneOf → flat Policy entity).
  const schemas = spec.components?.schemas ?? {};
  for (const [name, schema] of Object.entries(schemas)) {
    const flat = flattenSchema(schema, spec);
    const entity = schemaToEntity(name, flat);
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

  // 4) dedup X / XRepresentation пар (Keycloak G-K-1 / Gravitino G2).
  //    Schema-derived `XRepresentation` содержит полный fields-набор;
  //    path-derived `X` — короткое имя с minimal fields. Мерджим первое
  //    во второе, удаляем XRepresentation. Aliases тянут downstream
  //    rewrite для FK.references и intent.target/creates, если long имя
  //    где-то утекло. Opt-out: opts.dedupRepresentations = false.
  let finalEntities = entities;
  let finalIntents = intents;
  if (opts.dedupRepresentations !== false) {
    const suffix = opts.representationSuffix ?? "Representation";
    const { entities: mergedEntities, aliases } = mergeRepresentationDuplicates(entities, { suffix });
    finalEntities = rewriteReferencesByAliases(mergedEntities, aliases);
    finalIntents = rewriteIntentTargetsByAliases(intents, aliases);
  }

  // 5) markEmbeddedTypes (Keycloak G-K-3): entity без intent.target/creates
  //    помечается kind:"embedded". ROOT_PROJECTIONS whitelist'ы host'ов
  //    фильтруют embedded автоматически. Идёт после step 4 — aliases уже
  //    применены, target'ы на canonical short name.
  //    Opt-out: opts.markEmbedded = false.
  if (opts.markEmbedded !== false) {
    finalEntities = markEmbeddedTypes(finalEntities, finalIntents);
  }

  return {
    name: opts.name ?? "default",
    entities: finalEntities,
    intents: finalIntents,
    roles: { owner: { base: "owner" } },
  };
}
