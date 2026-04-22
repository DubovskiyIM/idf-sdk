const SKIPPED_PREFIXES = new Set(["api", "v1", "v2", "v3"]);

function toPascalSingular(seg) {
  const parts = seg.split(/[-_]/);
  const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  return singularize(pascal);
}

function singularize(word) {
  if (/ies$/i.test(word)) return word.replace(/ies$/i, "y");
  if (/ses$/i.test(word)) return word.replace(/ses$/i, "s");
  if (/xes$/i.test(word)) return word.replace(/xes$/i, "x");
  if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/i, "");
  return word;
}

/**
 * Walk OpenAPI path segments и вывести цепочку collection → param пар.
 *
 * Пример:
 *   /metalakes/{name}/catalogs/{catalog}/schemas/{schema}/tables
 *   →  [
 *        { entity: "Metalake", param: "name" },
 *        { entity: "Catalog",  param: "catalog" },
 *        { entity: "Schema",   param: "schema" },
 *        { entity: "Table",    param: null      }
 *      ]
 *
 * Последний элемент — это endpoint entity; остальные — ancestors (outer-first).
 * Skip-prefix'ы (api, v1, etc) пропускаются.
 *
 * @param {string} path — OpenAPI path ("/metalakes/{name}/catalogs")
 * @returns {Array<{entity:string, param:string|null}>}
 */
export function extractCollectionChain(path) {
  const rawSegs = path.split("/").filter(Boolean);
  const segs = rawSegs.filter((s) => !SKIPPED_PREFIXES.has(s.toLowerCase()));

  const chain = [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.startsWith("{")) continue;
    const next = segs[i + 1];
    chain.push({
      entity: toPascalSingular(seg),
      param: next && next.startsWith("{") ? next.slice(1, -1) : null,
    });
  }

  return chain;
}

/**
 * Для path'а возвращает { entity, parent } где parent — immediate parent
 * entity (для сборки FK). Если path плоский (без nesting) — parent: null.
 *
 * Используется в importOpenApi для синтеза FK-поля на child entity,
 * ссылающегося на parent — т.е. activate hierarchy-tree-nav pattern и
 * R8 hub-absorption на path-based REST APIs (Gravitino, K8s, AWS и др).
 *
 * @param {string} path
 * @returns {{ entity: string|null, parent: { entity: string, param: string|null }|null }}
 */
export function extractParentChain(path) {
  const chain = extractCollectionChain(path);
  if (chain.length === 0) return { entity: null, parent: null };

  const last = chain[chain.length - 1];
  // Если endpoint не collection-sibling (непосредственная коллекция), а
  // action/singleton — тот же entity, но parent берётся предыдущий.
  const parent = chain.length > 1 ? chain[chain.length - 2] : null;
  return { entity: last.entity, parent };
}

/**
 * Синтезирует FK-поле на entity, ссылающееся на parent.
 * Имя поля — `<parent.entity.lower>Id` (convention, используется
 * hierarchy-tree-nav pattern и R8 hub-absorption).
 * Metadata: kind="foreignKey" + references=parent.entity для semantic-aware
 * паттернов (будущее, см. G-items в docs/gravitino-gaps.md).
 *
 * Idempotent: если поле с таким именем уже существует — не перезаписывает.
 *
 * @param {object} entity — mutated in-place (с новым field)
 * @param {{entity: string, param: string|null}} parent
 * @returns {boolean} true если поле добавлено, false если уже было
 */
export function synthesizeFkField(entity, parent) {
  if (!entity || !parent || !parent.entity) return false;
  if (!entity.fields || typeof entity.fields !== "object") {
    entity.fields = {};
  }
  const fkName = parent.entity.charAt(0).toLowerCase() + parent.entity.slice(1) + "Id";
  if (entity.fields[fkName]) return false;
  entity.fields[fkName] = {
    type: "string",
    kind: "foreignKey",
    references: parent.entity,
    synthetic: "openapi-path",
  };
  return true;
}
