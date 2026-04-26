/** @typedef {import('../types/idf.d.ts').Effect} Effect */
/** @typedef {import('../types/idf.d.ts').World} World */
/**
 * @typedef {Object} Snapshot
 * @property {World} world — закэшированный мир
 * @property {number} count — число применённых confirmed effects
 * @property {string|null} lastEffectId — id последнего применённого effect (в causal-порядке)
 * @property {number} lastCreatedAt — created_at последнего применённого effect
 * @property {Record<string, string>} typeMap — typeMap, использованный при создании
 */

import { causalSort } from "./causalSort.js";

/**
 * Получить имя коллекции из effect.target с учётом typeMap.
 * Пример: target="user.name", typeMap={user:"users"} → "users".
 *
 * @param {string} target
 * @param {Record<string, string>} typeMap
 * @returns {string}
 */
export function getCollectionType(target, typeMap) {
  const base = target.split(".")[0];
  return typeMap[base] || base;
}

/**
 * Применить один confirmed effect к коллекциям (мутирует collections).
 *
 * Извлечён из inline-тела старого fold() для переиспользования в
 * createSnapshot/foldFromSnapshot. Поведение совпадает с прежним.
 *
 * Игнорируется:
 *   - target.startsWith("drafts") — черновики через foldDrafts
 *   - scope === "presentation" — Π через applyPresentation
 *
 * @param {Effect} ef
 * @param {Record<string, Record<string, Object>>} collections
 *   — мутируемая структура: { collectionType: { entityId: entity } }
 * @param {Record<string, string>} typeMap
 */
export function applyEffect(ef, collections, typeMap) {
  if (ef.target.startsWith("drafts")) return;
  if (ef.scope === "presentation") return;

  if (ef.alpha === "batch" && Array.isArray(ef.value)) {
    for (const sub of ef.value) applyEffect(sub, collections, typeMap);
    return;
  }

  const ctx = ef.context || {};
  const val = ef.value;
  const collType = getCollectionType(ef.target, typeMap);

  if (!collections[collType]) collections[collType] = {};

  switch (ef.alpha) {
    case "add": {
      const entityId = ctx.id || ef.id;
      collections[collType][entityId] = { ...ctx };
      break;
    }
    case "replace": {
      // Upsert: если сущности ещё нет, создаём partial из {id, field}.
      const entityId = ctx.id;
      if (entityId) {
        const field = ef.target.split(".").pop();
        const existing = collections[collType][entityId] || { id: entityId };
        collections[collType][entityId] = { ...existing, [field]: val };
      }
      break;
    }
    case "remove": {
      const entityId = ctx.id;
      if (entityId) delete collections[collType][entityId];
      break;
    }
  }
}

/**
 * Создать snapshot из набора confirmed effects (Task A1.2).
 *
 * Семантика: snapshot.world ≡ fold(effects, typeMap). Snapshot можно
 * передать в foldFromSnapshot вместе с дельтой следующих эффектов,
 * чтобы получить полный мир без re-apply всей истории.
 *
 * @param {Effect[]} effects
 * @param {Record<string, string>} [typeMap]
 * @returns {Snapshot}
 */
export function createSnapshot(effects, typeMap = {}) {
  const collections = {};
  const sorted = causalSort(effects);

  for (const ef of sorted) applyEffect(ef, collections, typeMap);

  const world = {};
  for (const [type, entities] of Object.entries(collections)) {
    world[type] = Object.values(entities);
  }

  const last = sorted[sorted.length - 1];
  return {
    world,
    count: sorted.length,
    lastEffectId: last ? last.id : null,
    lastCreatedAt: last ? (last.created_at ?? 0) : 0,
    typeMap,
  };
}

/**
 * Применить дельту effects поверх snapshot.world (Task A1.3).
 *
 * Семантика: foldFromSnapshot(createSnapshot(prefix), delta) ≡
 *   fold(prefix.concat(delta)) для любого split. Это даёт алгебраическую
 * гарантию ассоциативности, на которой строится incremental fold.
 *
 * Не мутирует snapshot.world (deep-clone сущностей).
 *
 * @param {Snapshot} snapshot
 * @param {Effect[]} deltaEffects
 * @param {Record<string, string>} [typeMap] — fallback на snapshot.typeMap
 * @returns {World}
 */
export function foldFromSnapshot(snapshot, deltaEffects, typeMap) {
  const effectiveTypeMap = typeMap ?? snapshot.typeMap ?? {};

  // Deep-clone сущностей snapshot.world в collections-shape
  const collections = {};
  for (const [type, entities] of Object.entries(snapshot.world)) {
    collections[type] = {};
    for (const ent of entities) {
      const id = ent.id;
      if (id != null) collections[type][id] = { ...ent };
    }
  }

  // Применить дельту в causal-порядке
  const sortedDelta = causalSort(deltaEffects);
  for (const ef of sortedDelta) applyEffect(ef, collections, effectiveTypeMap);

  // Собрать world
  const world = {};
  for (const [type, entities] of Object.entries(collections)) {
    world[type] = Object.values(entities);
  }
  return world;
}
