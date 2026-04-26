/** @typedef {import('../types/idf.d.ts').Effect} Effect */
/** @typedef {import('../types/idf.d.ts').Ontology} Ontology */
/** @typedef {import('../types/idf.d.ts').World} World */

import { causalSort } from "./causalSort.js";
import { applyEffect, getCollectionType, foldFromSnapshot } from "./snapshot.js";

/**
 * Построить маппинг singular→plural из онтологии.
 * @param {Ontology} [ontology]
 * @returns {Record<string, string>}
 */
export function buildTypeMap(ontology) {
  const map = { draft: "drafts" };
  if (ontology?.entities) {
    for (const entityName of Object.keys(ontology.entities)) {
      const singular = entityName.toLowerCase();
      const plural = singular.endsWith("s") ? singular + "es"
        : singular.endsWith("y") ? singular.slice(0, -1) + "ies"
        : singular + "s";
      map[singular] = plural;
    }
  }
  return map;
}

/**
 * fold(effects, typeMap, options) → world (объект по типам сущностей)
 *
 * По манифесту: World(t) = fold(⊕, ∅, sort≺(Φ_confirmed ↓ t))
 *
 * Эффекты сортируются причинно (parent_id → child) перед применением.
 *
 * Если options.snapshot передан, fold делегирует в foldFromSnapshot —
 * incremental режим. Иначе — full fold с нуля. Backward-compat:
 * fold(effects) и fold(effects, typeMap) работают как раньше.
 *
 * @param {Effect[]} effects
 * @param {Record<string, string>} [typeMap]
 * @param {{ snapshot?: import('./snapshot.js').Snapshot }} [options]
 * @returns {World}
 */
export function fold(effects, typeMap, options = {}) {
  if (options.snapshot) {
    // typeMap может быть undefined — foldFromSnapshot fallback'ает
    // на snapshot.typeMap. Если typeMap передан явно (включая {}) —
    // он имеет приоритет.
    return foldFromSnapshot(options.snapshot, effects, typeMap);
  }

  const effectiveTypeMap = typeMap ?? {};
  const collections = {};
  const sorted = causalSort(effects);

  for (const ef of sorted) applyEffect(ef, collections, effectiveTypeMap);

  const world = {};
  for (const [type, entities] of Object.entries(collections)) {
    world[type] = Object.values(entities);
  }
  return world;
}

/**
 * Применить косметические эффекты (Π) поверх world.
 * Мутирует копию world — обновляет визуальные свойства (x, y, порядок и т.д.)
 */
export function applyPresentation(world, effects, typeMap = {}) {
  const result = {};
  for (const [key, arr] of Object.entries(world)) {
    result[key] = arr.map(e => ({ ...e }));
  }

  for (const ef of effects) {
    if (ef.scope !== "presentation") continue;
    const ctx = ef.context || {};
    const val = ef.value;
    const collType = getCollectionType(ef.target, typeMap);

    if (ef.alpha === "replace" && ctx.id && result[collType]) {
      const entity = result[collType].find(e => e.id === ctx.id);
      if (entity) {
        const field = ef.target.split(".").pop();
        entity[field] = val;
      }
    }
  }

  return result;
}

/**
 * Свернуть только черновики Δ.
 */
export function foldDrafts(effects) {
  const drafts = {};
  for (const ef of effects) {
    if (!ef.target.startsWith("drafts")) continue;
    const ctx = ef.context || {};

    switch (ef.alpha) {
      case "add": {
        const entityId = ctx.id || ef.id;
        drafts[entityId] = { ...ctx, _effectId: ef.id };
        break;
      }
      case "replace": {
        const entityId = ctx.id;
        if (entityId && drafts[entityId]) {
          const field = ef.target.split(".").pop();
          if (field !== "drafts") {
            drafts[entityId] = { ...drafts[entityId], [field]: ef.value };
          }
        }
        break;
      }
      case "remove": {
        const entityId = ctx.id;
        if (entityId) delete drafts[entityId];
        break;
      }
    }
  }
  return Object.values(drafts);
}

/**
 * Отфильтровать эффекты по статусам.
 *
 * @param {Effect[]} effects
 * @param {...string} statuses
 * @returns {Effect[]}
 */
export function filterByStatus(effects, ...statuses) {
  return effects.filter(e => statuses.includes(e.status));
}
