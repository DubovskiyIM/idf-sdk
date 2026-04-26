/**
 * Polymorphic foreign-key fields (§12.9 — 2026-04-27, Notion field-test).
 *
 * Закрывает кейс sparse-FK: одна сущность ссылается на разные родители через
 * взаимоисключающие колонки. Канонический пример — `Comment.pageId` XOR
 * `Comment.blockId` в Notion: комментарий привязан **либо** к странице,
 * **либо** к блоку, но не к обоим. Без формализации автор пишет два expression
 * invariant'а ("xor" + "exactly-one set"), теряет declarative shape и
 * derivation-сигналы (FK-graph не видит targeted сущность).
 *
 * Декларация — virtual field с `kind: "polymorphicFk"`:
 *
 *   Comment: {
 *     fields: {
 *       pageId:  { type: "id", entity: "Page",  optional: true },
 *       blockId: { type: "id", entity: "Block", optional: true },
 *       target: {
 *         kind: "polymorphicFk",
 *         alternatives: [
 *           { entity: "Page",  field: "pageId"  },
 *           { entity: "Block", field: "blockId" },
 *         ],
 *         cardinality: "exactly-one",  // default; "at-most-one" — для optional FK
 *       },
 *     },
 *   }
 *
 * `target` — virtual: оно не хранится как колонка, это metadata о констрейнте.
 * Concrete columns (`pageId`, `blockId`) объявляются обычно в `fields`.
 *
 * API:
 *   - isPolymorphicFkField(fieldDef)             — type guard
 *   - getPolymorphicFkFields(entityDef)          — массив [{name, def}]
 *   - getActiveAlternative(row, fkDef)           — какая alternative непустая
 *   - validatePolymorphicFkRow(row, fkDef)       — boolean (cardinality OK?)
 *   - buildPolymorphicFkInvariants(entities)     — авто-генерация expression
 *                                                  invariant'ов для всех PFK
 *
 * Backward-compat: legacy схема (concrete `pageId` / `blockId` без virtual
 * `target`) продолжает работать. Host опциально мигрирует и удаляет ручные
 * expression invariant'ы.
 */

/**
 * Является ли fieldDef polymorphicFk-декларацией.
 * @param {object} fieldDef
 * @returns {boolean}
 */
export function isPolymorphicFkField(fieldDef) {
  return !!(
    fieldDef &&
    typeof fieldDef === "object" &&
    fieldDef.kind === "polymorphicFk" &&
    Array.isArray(fieldDef.alternatives) &&
    fieldDef.alternatives.length >= 2
  );
}

/**
 * Вернуть все polymorphic-FK поля entity (как [{name, def}]).
 * @param {object} entityDef
 * @returns {Array<{name: string, def: object}>}
 */
export function getPolymorphicFkFields(entityDef) {
  if (!entityDef || !entityDef.fields || typeof entityDef.fields !== "object") return [];
  const out = [];
  for (const [name, def] of Object.entries(entityDef.fields)) {
    if (isPolymorphicFkField(def)) out.push({ name, def });
  }
  return out;
}

/**
 * Какая из alternatives «активна» в данной строке (т.е. соответствующая колонка
 * непустая). Возвращает первую найденную (если cardinality="exactly-one" — должна
 * быть ровно одна; используется через validatePolymorphicFkRow).
 *
 * @param {object} row
 * @param {object} fkDef — polymorphicFk field-def
 * @returns {{entity: string, field: string, value: any} | null}
 */
export function getActiveAlternative(row, fkDef) {
  if (!row || !isPolymorphicFkField(fkDef)) return null;
  for (const alt of fkDef.alternatives) {
    const value = row?.[alt.field];
    if (value !== undefined && value !== null && value !== "") {
      return { entity: alt.entity, field: alt.field, value };
    }
  }
  return null;
}

/**
 * Валидирует cardinality:
 *   "exactly-one"  — ровно одна alternative непустая
 *   "at-most-one"  — 0 или 1 alternative непустая
 *
 * @param {object} row
 * @param {object} fkDef
 * @returns {{ ok: boolean, count: number, reason?: string }}
 */
export function validatePolymorphicFkRow(row, fkDef) {
  if (!isPolymorphicFkField(fkDef)) {
    return { ok: false, count: 0, reason: "not a polymorphicFk field" };
  }
  const cardinality = fkDef.cardinality || "exactly-one";
  let count = 0;
  for (const alt of fkDef.alternatives) {
    const v = row?.[alt.field];
    if (v !== undefined && v !== null && v !== "") count++;
  }
  if (cardinality === "exactly-one") {
    if (count !== 1) {
      return {
        ok: false,
        count,
        reason: count === 0
          ? `exactly-one violated: ни одна из ${fkDef.alternatives.map(a => a.field).join("/")} не задана`
          : `exactly-one violated: ${count} alternatives заданы одновременно`,
      };
    }
    return { ok: true, count };
  }
  if (cardinality === "at-most-one") {
    if (count > 1) {
      return {
        ok: false,
        count,
        reason: `at-most-one violated: ${count} alternatives заданы одновременно`,
      };
    }
    return { ok: true, count };
  }
  return { ok: false, count, reason: `unknown cardinality: ${cardinality}` };
}

/**
 * Построить expression-invariant'ы для всех polymorphicFk полей в `entities`.
 * Возвращает массив, который автор может скопировать в `ontology.invariants`
 * (или host SDK / engine может вызвать на init).
 *
 * Каждый invariant — `{ kind: "expression", name, entity, predicate }` где
 * predicate `(row, world, viewer, context) => boolean` (true = OK).
 *
 * @param {object} entities — `ontology.entities`
 * @returns {Array<object>}
 */
export function buildPolymorphicFkInvariants(entities) {
  if (!entities || typeof entities !== "object") return [];
  const out = [];
  for (const [entityName, entityDef] of Object.entries(entities)) {
    const pfks = getPolymorphicFkFields(entityDef);
    for (const { name, def } of pfks) {
      const altFields = def.alternatives.map(a => a.field);
      out.push({
        kind: "expression",
        name: `${entityName}_${name}_polymorphicFk`,
        entity: entityName,
        message: `Поле «${name}» (polymorphic FK) нарушает cardinality ${def.cardinality || "exactly-one"} — alternatives: ${altFields.join(", ")}`,
        predicate: (row) => validatePolymorphicFkRow(row, def).ok,
      });
    }
  }
  return out;
}

/**
 * Resolve целевой родитель для row через polymorphicFk: вернуть
 * { entity, id } если row имеет активную alternative и parent существует
 * в world; иначе null.
 *
 * Полезно для materializers / FK-graph traversal.
 *
 * @param {object} row
 * @param {object} fkDef
 * @param {object} world
 * @param {function?} resolveCollection — (entity) => collection-array (опц.,
 *        дефолт: world[entity.toLowerCase() + "s"]).
 */
export function resolvePolymorphicFkParent(row, fkDef, world, resolveCollection) {
  const active = getActiveAlternative(row, fkDef);
  if (!active) return null;
  const collFn = resolveCollection || ((ent) => world?.[ent.toLowerCase() + "s"]);
  const collection = collFn(active.entity) || [];
  if (!Array.isArray(collection)) return null;
  const parent = collection.find(r => r && r.id === active.value);
  if (!parent) return null;
  return { entity: active.entity, id: active.value, row: parent };
}
