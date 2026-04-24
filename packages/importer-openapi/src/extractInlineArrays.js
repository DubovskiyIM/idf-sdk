import { flattenSchema } from "./flattenSchema.js";
import { propertyToField } from "./schemaToEntity.js";

/**
 * K8s CRD и audit-log API часто содержат inline массивы объектов, которые
 * **не** выносятся в отдельный top-level schema с path-collection:
 *
 *   Application.status.resources[]  // K8s Deployment / Service / Pod список
 *   Application.status.conditions[] // audit-log (type / status / lastTransitionTime)
 *
 * Стандартный importer мапит их в `{ type: "json" }` (см. TYPE_MAP в
 * `schemaToEntity`) и теряет структуру items. Renderer получает плоский blob,
 * а host (ArgoCD) вынужден декларировать синтетические entities (`Resource`,
 * `ApplicationCondition`) с синтетическим FK на parent.
 *
 * `extractInlineArrays` ищет такие inline arrays и аннотирует parent
 * entity metadata:
 *
 *   entity.inlineCollections = [
 *     {
 *       fieldName: "resources",
 *       path: ["status", "resources"],           // nested access path
 *       itemName: "Resource",                    // из items.$ref, если был
 *       itemFields: { kind:{type:"string"}, ... },
 *       description: "...",
 *     },
 *   ]
 *
 * Renderer читает `inlineCollections[]` и рендерит child-коллекцию БЕЗ
 * FK-lookup — items резолвятся прямо из `parent[path[0]][path[1]]`. Это
 * backlog §10.4a (ArgoCD dogfood), base для inline-children primitive в
 * renderer + resourceTree/conditionsTimeline dispatchers.
 *
 * Опции:
 *   - `opts.includeStatus = true`  — сканировать поля вложенные в `status.*`
 *     (K8s-specific паттерн). Default true.
 *   - `opts.maxDepth = 3`          — сколько уровней вложенности сканируем
 *     (хватает для `status.resources[]`, `spec.source.helm.parameters[]`).
 *   - `opts.minItemFields = 2`     — минимум полей в items, чтобы inline
 *     считался «коллекцией», а не свободной строкой опций.
 *
 * @param {Record<string, object>} entities
 * @param {object} spec — raw OpenAPI spec (для resolveRef в items)
 * @param {object} [opts]
 * @returns {Record<string, object>} новый entities map с inlineCollections
 */
export function extractInlineArrays(entities, spec, opts = {}) {
  const includeStatus = opts.includeStatus !== false;
  const maxDepth = opts.maxDepth ?? 3;
  const minItemFields = opts.minItemFields ?? 2;

  const result = { ...entities };
  const schemas = spec?.components?.schemas ?? {};

  for (const entityName of Object.keys(result)) {
    const rawSchema = schemas[entityName];
    if (!rawSchema) continue; // path-derived stubs не сканируем
    const flat = flattenSchema(rawSchema, spec);
    if (!flat || typeof flat !== "object") continue;
    if (!flat.properties || typeof flat.properties !== "object") continue;

    const collections = [];
    scanObject(flat, [], collections, spec, {
      includeStatus,
      maxDepth,
      minItemFields,
    });

    if (collections.length > 0) {
      result[entityName] = {
        ...result[entityName],
        inlineCollections: collections,
      };
    }
  }

  return result;
}

function scanObject(schema, path, out, spec, opts) {
  if (!schema?.properties) return;
  if (path.length > opts.maxDepth) return;

  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const resolved = flattenSchema(propSchema, spec);
    if (!resolved) continue;

    if (resolved.type === "array") {
      const items = flattenSchema(resolved.items, spec);
      if (isObjectWithProperties(items) && countProperties(items) >= opts.minItemFields) {
        const itemFields = {};
        for (const [k, v] of Object.entries(items.properties)) {
          itemFields[k] = propertyToField(k, v);
        }
        out.push({
          fieldName: propName,
          path: [...path, propName],
          itemName: extractRefName(propSchema.items) ?? extractRefName(resolved.items) ?? null,
          itemFields,
          ...(items.description ? { description: items.description } : {}),
          ...(resolved.description ? { arrayDescription: resolved.description } : {}),
        });
      }
    } else if (isObjectWithProperties(resolved)) {
      // Recurse into nested object; но только для status / spec / data
      // prefixes (K8s CRD паттерн), если includeStatus=true — то разрешаем
      // сразу.
      if (!opts.includeStatus && path.length === 0 && !NESTED_SCAN_PREFIXES.has(propName)) {
        continue;
      }
      scanObject(resolved, [...path, propName], out, spec, opts);
    }
  }
}

const NESTED_SCAN_PREFIXES = new Set(["status", "spec", "data", "metadata"]);

function isObjectWithProperties(schema) {
  if (!schema || typeof schema !== "object") return false;
  if (schema.type && schema.type !== "object") return false;
  return !!schema.properties && typeof schema.properties === "object";
}

function countProperties(schema) {
  return Object.keys(schema.properties ?? {}).length;
}

function extractRefName(schema) {
  if (!schema?.$ref || typeof schema.$ref !== "string") return null;
  const parts = schema.$ref.split("/");
  return parts[parts.length - 1] ?? null;
}
