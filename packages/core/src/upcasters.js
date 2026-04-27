/** @typedef {import('../types/idf.d.ts').Effect} Effect */
/** @typedef {import('../types/idf.d.ts').Ontology} Ontology */
/** @typedef {import('../types/idf.d.ts').World} World */
/** @typedef {import('./evolutionLog.js').OntologyVersion} OntologyVersion */

/**
 * Φ schema-versioning — Phase 3: applyUpcaster + fold(upcast(Φ, target)).
 *
 * Контракт зафиксирован в design-spec
 * `idf/docs/design/2026-04-26-phi-schema-versioning-spec.md` §4.3-§4.4.
 * Backlog item: idf/docs/backlog.md §2.8.
 *
 * Опирается на Phase 0 (schemaVersion helpers) и Phase 2 (evolution log).
 *
 * Upcaster shape:
 *   {
 *     fromHash: string;
 *     toHash:   string;
 *     declarative?: {
 *       rename?:             Array<{ entity, from, to }>;
 *       splitDiscriminator?: Array<{ from, field, mapping: { value → entity } }>;
 *       setDefault?:         Array<{ entity, field, value }>;
 *       enumMap?:            Array<{ entity, field, mapping: { oldValue → newValue } }>;
 *     };
 *     fn?: (effect, world) => Effect | Effect[] | null;
 *   }
 *
 * Жёсткий запрет: fn — design-time JS-код, написанный человеком (опц. сгенерированный
 * LLM, но зафиксированный в репо). Никогда не runtime-LLM. Иначе смерть детерминизма
 * формата (см. spec §1).
 *
 * Применение declarative-шагов в фиксированном порядке (per single effect):
 *   1. rename                — канонизируем имена полей
 *   2. splitDiscriminator    — переезд эффекта в новую сущность
 *   3. setDefault            — заполняем missing-поля
 *   4. enumMap               — переводим old → new значения
 *
 * Этот порядок детерминирован и документирован — cross-stack импл'ы должны
 * соблюдать его. Изменение порядка — breaking change самого upcast-протокола.
 */

import { causalSort } from "./causalSort.js";
import { fold, buildTypeMap } from "./fold.js";
import {
  UNKNOWN_SCHEMA_VERSION,
  getSchemaVersion,
} from "./schemaVersion.js";
import {
  findVersionByHash,
  getCurrentVersionHash,
  getAncestry,
  getEvolutionLog,
} from "./evolutionLog.js";

// ─────────────────────────────────────────────────────────────────────────────
// Effect-target parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Разобрать target эффекта на entity и path.
 * "Task" → { entity: "Task", path: [] }
 * "Task.priority" → { entity: "Task", path: ["priority"] }
 * "Task.foo.bar" → { entity: "Task", path: ["foo", "bar"] }
 *
 * @param {string} target
 * @returns {{ entity: string, path: string[] }}
 */
function parseTarget(target) {
  if (typeof target !== "string" || target.length === 0) {
    return { entity: "", path: [] };
  }
  const [entity, ...rest] = target.split(".");
  return { entity, path: rest };
}

/**
 * @param {string} entity
 * @param {string[]} path
 * @returns {string}
 */
function buildTarget(entity, path) {
  return path.length === 0 ? entity : `${entity}.${path.join(".")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Declarative steps (each: pure, returns new Effect or unchanged)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * rename: Array<{ entity, from, to }>
 * Переименовать поле во всех формах эффекта:
 *   - context[from] → context[to]
 *   - target "Entity.from" → "Entity.to"
 *
 * @param {Effect} effect
 * @param {Array<{ entity: string, from: string, to: string }>} steps
 * @returns {Effect}
 */
export function applyRename(effect, steps) {
  if (!Array.isArray(steps) || steps.length === 0) return effect;
  const { entity, path } = parseTarget(effect.target);

  let nextEffect = effect;
  for (const step of steps) {
    if (!step || step.entity !== entity) continue;
    if (typeof step.from !== "string" || typeof step.to !== "string") continue;

    // 1. context[from] → context[to]
    const ctx = nextEffect.context;
    if (ctx && typeof ctx === "object" && !Array.isArray(ctx) && step.from in ctx) {
      const renamed = { ...ctx };
      renamed[step.to] = renamed[step.from];
      delete renamed[step.from];
      nextEffect = { ...nextEffect, context: renamed };
    }

    // 2. target "Entity.from" → "Entity.to" (только верхнеуровневый field-replace)
    if (path.length === 1 && path[0] === step.from) {
      nextEffect = { ...nextEffect, target: buildTarget(entity, [step.to]) };
    }
  }
  return nextEffect;
}

/**
 * splitDiscriminator: Array<{ from, field, mapping: Record<string, string> }>
 * Если эффект эмиттен в `from`-сущности и имеет дискриминатор-поле со значением
 * X, и mapping[X] = NewEntity → переписываем target на NewEntity, добавляем
 * lineage `__derivedFrom: effect.id` (если ещё нет).
 *
 * Для совместимости со spec §3 (lineage requirement) — derivedFrom всегда
 * проставляется, чтобы reader-equivalence Layer 4 мог трекать происхождение.
 *
 * @param {Effect} effect
 * @param {Array<{ from: string, field: string, mapping: Record<string, string> }>} steps
 * @returns {Effect}
 */
export function applySplitDiscriminator(effect, steps) {
  if (!Array.isArray(steps) || steps.length === 0) return effect;
  const { entity, path } = parseTarget(effect.target);
  const ctx = effect.context;
  if (!ctx || typeof ctx !== "object" || Array.isArray(ctx)) return effect;

  let nextEffect = effect;
  for (const step of steps) {
    if (!step || step.from !== entity || typeof step.field !== "string") continue;
    const mapping = step.mapping;
    if (!mapping || typeof mapping !== "object") continue;

    const discriminatorValue = ctx[step.field];
    if (typeof discriminatorValue !== "string") continue;

    const newEntity = mapping[discriminatorValue];
    if (typeof newEntity !== "string" || newEntity.length === 0) continue;

    const newCtx = "__derivedFrom" in ctx
      ? ctx
      : { ...ctx, __derivedFrom: effect.id };

    nextEffect = {
      ...nextEffect,
      target: buildTarget(newEntity, path),
      context: newCtx,
    };
  }
  return nextEffect;
}

/**
 * setDefault: Array<{ entity, field, value }>
 * Заполнить missing-поля в context дефолтными значениями. Применяется только
 * когда entity эффекта совпадает и context не содержит поле (undefined).
 *
 * Применяется только к α === "add" эффектам — для replace/remove семантика
 * partial-merge'а: отсутствие поля = «не трогаем», и подмешивать default'ы
 * сюда было бы нарушением намерения автора.
 *
 * @param {Effect} effect
 * @param {Array<{ entity: string, field: string, value: unknown }>} steps
 * @returns {Effect}
 */
export function applySetDefault(effect, steps) {
  if (!Array.isArray(steps) || steps.length === 0) return effect;
  if (effect.alpha !== "add") return effect;
  const { entity } = parseTarget(effect.target);
  const ctx = effect.context;
  if (!ctx || typeof ctx !== "object" || Array.isArray(ctx)) return effect;

  let nextCtx = ctx;
  let touched = false;
  for (const step of steps) {
    if (!step || step.entity !== entity || typeof step.field !== "string") continue;
    if (!(step.field in nextCtx)) {
      nextCtx = { ...nextCtx, [step.field]: step.value };
      touched = true;
    }
  }
  return touched ? { ...effect, context: nextCtx } : effect;
}

/**
 * enumMap: Array<{ entity, field, mapping: Record<string, string> }>
 * Преобразовать значения enum'а old → new. Применяется к:
 *   - α === "add" / α === "replace" с context[field] (entity-level)
 *   - α === "replace" target "Entity.field" с value (field-level replace)
 *
 * Если значение не найдено в mapping — оставляем как есть (reader gap policy
 * на чтении в Phase 4 решит, что показывать для unknown-enum).
 *
 * @param {Effect} effect
 * @param {Array<{ entity: string, field: string, mapping: Record<string, string> }>} steps
 * @returns {Effect}
 */
export function applyEnumMap(effect, steps) {
  if (!Array.isArray(steps) || steps.length === 0) return effect;
  const { entity, path } = parseTarget(effect.target);

  let nextEffect = effect;
  for (const step of steps) {
    if (!step || step.entity !== entity || typeof step.field !== "string") continue;
    const mapping = step.mapping;
    if (!mapping || typeof mapping !== "object") continue;

    // Case 1: context[field] для add / replace (entity-level)
    const ctx = nextEffect.context;
    if (ctx && typeof ctx === "object" && !Array.isArray(ctx)) {
      const oldValue = ctx[step.field];
      if (typeof oldValue === "string" && oldValue in mapping) {
        nextEffect = { ...nextEffect, context: { ...ctx, [step.field]: mapping[oldValue] } };
      }
    }

    // Case 2: target "Entity.field" + value (field-level replace)
    if (
      nextEffect.alpha === "replace" &&
      path.length === 1 &&
      path[0] === step.field &&
      typeof nextEffect.value === "string" &&
      nextEffect.value in mapping
    ) {
      nextEffect = { ...nextEffect, value: mapping[nextEffect.value] };
    }
  }
  return nextEffect;
}

// ─────────────────────────────────────────────────────────────────────────────
// applyDeclarativeUpcaster — композиция четырёх шагов в фиксированном порядке
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Применить declarative-блок upcaster'а к эффекту. Композиция:
 *   1. rename
 *   2. splitDiscriminator
 *   3. setDefault
 *   4. enumMap
 *
 * @param {Effect} effect
 * @param {Object} declarative — Upcaster.declarative
 * @returns {Effect}
 */
export function applyDeclarativeUpcaster(effect, declarative) {
  if (!declarative || typeof declarative !== "object") return effect;
  let next = effect;
  if (Array.isArray(declarative.rename)) next = applyRename(next, declarative.rename);
  if (Array.isArray(declarative.splitDiscriminator)) next = applySplitDiscriminator(next, declarative.splitDiscriminator);
  if (Array.isArray(declarative.setDefault)) next = applySetDefault(next, declarative.setDefault);
  if (Array.isArray(declarative.enumMap)) next = applyEnumMap(next, declarative.enumMap);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// applyUpcaster — declarative + functional, выдаёт Effect | Effect[] | null
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Применить один upcaster (один шаг A → B) к эффекту.
 * Сначала declarative (всегда возвращает single Effect), потом fn (escape hatch
 * для сложных миграций — может вернуть Effect[], null или single).
 *
 * Возвращаемые значения:
 *   - Effect       — single result (typical case)
 *   - Effect[]     — split в несколько эффектов (e.g. one row → several derived)
 *   - null         — drop эффект (e.g. legacy noop, sensitive removal)
 *
 * @param {Effect} effect
 * @param {Object} upcaster — { fromHash, toHash, declarative?, fn? }
 * @param {World} [world]
 * @returns {Effect | Effect[] | null}
 */
export function applyUpcaster(effect, upcaster, world = {}) {
  if (!upcaster || typeof upcaster !== "object") return effect;

  // 1. Declarative — pure, всегда single Effect
  let result = applyDeclarativeUpcaster(effect, upcaster.declarative);

  // 2. Functional — может вернуть Effect | Effect[] | null
  if (typeof upcaster.fn === "function") {
    try {
      const fnResult = upcaster.fn(result, world);
      if (fnResult === null) return null;
      if (Array.isArray(fnResult)) return fnResult.filter(Boolean);
      if (fnResult && typeof fnResult === "object") return fnResult;
    } catch (err) {
      // fn — design-time код; runtime exception = bug автора. Безопасно вернуть
      // input — не «терять» эффект, оставить детерминированно интерпретируемым.
      // Phase 5 (Layer 4 detector) поймает дисперсию через reader-equivalence.
      console.warn(`[applyUpcaster] fn threw, falling back to input: ${err?.message ?? err}`);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path resolution: build chain of upcasters from fromHash to toHash
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Найти цепочку upcaster'ов от fromHash до toHash через ontology.evolution[].
 *
 * Стратегия:
 *   - Получаем ancestry для toHash (root → toHash).
 *   - Находим в этой цепочке fromHash (или null/UNKNOWN — стартуем с root).
 *   - Из каждого entry между ними берём entry.upcasters[*].
 *
 * Возвращает массив upcaster-объектов в порядке применения. Пустой массив:
 *   - fromHash === toHash (no-op)
 *   - fromHash недостижим из toHash
 *   - upcasters не объявлены в промежуточных entry
 *
 * @param {string} fromHash — может быть UNKNOWN_SCHEMA_VERSION для legacy effects
 * @param {string} toHash
 * @param {Ontology} ontology
 * @returns {Array<Object>}
 */
export function pathFromTo(fromHash, toHash, ontology) {
  if (!toHash || typeof toHash !== "string") return [];
  if (fromHash === toHash) return [];

  const ancestry = getAncestry(ontology, toHash);
  if (ancestry.length === 0) return [];

  // Определяем стартовую точку в ancestry
  let startIdx;
  if (!fromHash || fromHash === UNKNOWN_SCHEMA_VERSION) {
    // Legacy effect — стартуем с самого root, применяем все upcasters в цепочке
    startIdx = 0;
  } else {
    const idx = ancestry.findIndex(e => e.hash === fromHash);
    if (idx === -1) return []; // fromHash не в линии toHash — chain невозможен
    startIdx = idx + 1;
  }

  const upcasters = [];
  for (let i = startIdx; i < ancestry.length; i++) {
    const entry = ancestry[i];
    if (Array.isArray(entry.upcasters)) {
      for (const u of entry.upcasters) {
        if (u && typeof u === "object") upcasters.push(u);
      }
    }
  }
  return upcasters;
}

// ─────────────────────────────────────────────────────────────────────────────
// upcastEffect / upcastEffects — apply chain to effect(s)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Применить цепочку upcaster'ов к одному эффекту. Поддерживает split (Effect[])
 * и drop (null) на любом шаге.
 *
 * @param {Effect} effect
 * @param {string} targetHash — целевой schemaVersion (обычно current)
 * @param {Ontology} ontology
 * @param {World} [world]
 * @returns {Effect[]} — может быть [], [single] или [several]
 */
export function upcastEffect(effect, targetHash, ontology, world = {}) {
  const fromHash = getSchemaVersion(effect);
  const path = pathFromTo(fromHash, targetHash, ontology);
  if (path.length === 0) return [effect];

  let queue = [effect];
  for (const upcaster of path) {
    const next = [];
    for (const e of queue) {
      const r = applyUpcaster(e, upcaster, world);
      if (r === null) continue;
      if (Array.isArray(r)) next.push(...r);
      else if (r && typeof r === "object") next.push(r);
    }
    queue = next;
  }
  return queue;
}

/**
 * Batch-версия upcastEffect. Возвращает плоский массив upcasted-эффектов.
 * targetHash по умолчанию = getCurrentVersionHash(ontology).
 *
 * @param {Effect[]} effects
 * @param {Ontology} ontology
 * @param {{ targetHash?: string, world?: World }} [opts]
 * @returns {Effect[]}
 */
export function upcastEffects(effects, ontology, opts = {}) {
  if (!Array.isArray(effects) || effects.length === 0) return [];
  const targetHash = opts.targetHash ?? getCurrentVersionHash(ontology);
  // Если evolution log пустой и/или targetHash отсутствует — no-op upcast.
  if (!targetHash || getEvolutionLog(ontology).length === 0) {
    return effects.slice();
  }
  const world = opts.world ?? {};
  const out = [];
  for (const e of effects) {
    const upcasted = upcastEffect(e, targetHash, ontology, world);
    out.push(...upcasted);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// foldWithUpcast — wrapper над fold с автоматическим upcast по evolution log
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Свернуть эффекты в world, применяя upcast-цепочку из ontology.evolution[].
 *
 * Семантика spec §4.4:
 *   world = fold(upcast(Φ_confirmed, currentSchema))
 *
 * Если у онтологии нет evolution log — поведение совпадает с обычным fold().
 * Эффекты сортируются причинно через causalSort, как в fold; upcast применяется
 * до причинной сортировки, чтобы split может попасть в нужный порядок через
 * derivedFrom-lineage.
 *
 * @param {Effect[]} effects
 * @param {Ontology} ontology
 * @param {{ typeMap?: Record<string, string>, targetHash?: string }} [opts]
 * @returns {World}
 */
export function foldWithUpcast(effects, ontology, opts = {}) {
  // По умолчанию используем buildTypeMap(ontology) — fold без typeMap кладёт
  // эффекты под singular-name, а ontology-driven flow ожидает plural.
  // Caller может передать явный typeMap (e.g. host'ы со своей конвенцией).
  const typeMap = opts.typeMap ?? buildTypeMap(ontology);
  const log = getEvolutionLog(ontology);
  if (log.length === 0) {
    return fold(effects, typeMap);
  }
  const upcasted = upcastEffects(effects, ontology, { targetHash: opts.targetHash });
  // causalSort гарантирует parent_id → child порядок; upcasted-effects могут
  // получить новые ids в результате fn-split — порядок сохраняется через
  // переборку в upcastEffects (out.push в исходном порядке).
  return fold(causalSort(upcasted), typeMap);
}
