/**
 * resolveCompositions — runtime helper для R9.
 *
 * Обогащает items проекции (результат fold) значениями под alias-полями
 * согласно artifact.slots...compositions или proj.compositions.
 *
 * mode: "one"  — item[as] = world[entity].find(x => x.id === item[via])
 * mode: "many" — item[as] = world[entity].filter(x => x[via] === item.id)
 *
 * Через это primitive atoms в @intent-driven/renderer могут обращаться к
 * `item.task.title`, `item.customer.name` — aliased paths, объявленные
 * через ontology.compositions и внесённые R9 в artifact.
 *
 * Спецификация: idf-manifest-v2.1/docs/design/rule-R9-cross-entity-spec.md
 *
 * @module crystallize_v2/resolveCompositions
 */

/**
 * Обогащает один item согласно списку compositions.
 * @param {object} item — сырая запись из world[mainEntity]
 * @param {Array<{entity: string, as: string, via: string, mode?: string}>} compositions
 * @param {Record<string, object[]>} world — fold(Φ) result, keyed by entity type
 * @returns {object} новый объект с добавленными alias-полями (item не мутируется)
 */
export function resolveItemCompositions(item, compositions, world) {
  if (!item || typeof item !== "object") return item;
  if (!Array.isArray(compositions) || compositions.length === 0) return { ...item };
  const result = { ...item };
  for (const comp of compositions) {
    if (!comp || !comp.entity || !comp.as || !comp.via) continue;
    const collection = world?.[comp.entity];
    if (!Array.isArray(collection)) {
      result[comp.as] = comp.mode === "many" ? [] : null;
      continue;
    }
    if (comp.mode === "many") {
      // item — parent, collection — child'ы. Фильтруем по comp.via === item.id.
      result[comp.as] = collection.filter(child => child && child[comp.via] === item.id);
    } else {
      // "one" (default): item — child с FK, collection.id === item[comp.via]
      const fkValue = item[comp.via];
      result[comp.as] = fkValue == null
        ? null
        : (collection.find(rec => rec && rec.id === fkValue) || null);
    }
  }
  return result;
}

/**
 * Batch: обогащает массив items.
 * @param {object[]} items
 * @param {Array} compositions
 * @param {Record<string, object[]>} world
 * @returns {object[]}
 */
export function resolveCompositions(items, compositions, world) {
  if (!Array.isArray(items)) return items;
  if (!Array.isArray(compositions) || compositions.length === 0) return items.slice();
  return items.map(it => resolveItemCompositions(it, compositions, world));
}

/**
 * Удобный path-lookup для aliased fields из composition.
 *
 * Пример: `getAliasedField(item, "task.title")` возвращает item.task?.title,
 * но с защитой от null / undefined на любом уровне.
 *
 * @param {object} item — uже обогащённый через resolveItemCompositions
 * @param {string} path — "alias.field" или "field" (один уровень допустим)
 * @returns {*} значение или undefined
 */
export function getAliasedField(item, path) {
  if (!item || typeof item !== "object" || typeof path !== "string") return undefined;
  const parts = path.split(".");
  let cur = item;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}
