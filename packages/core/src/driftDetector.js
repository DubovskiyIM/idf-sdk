/** @typedef {import('../types/idf.d.ts').Ontology} Ontology */
/** @typedef {import('../types/idf.d.ts').World} World */
/** @typedef {import('./readerGapPolicy.js').GapDescriptor} GapDescriptor */
/** @typedef {import('./readerGapPolicy.js').ReaderKind} ReaderKind */
/** @typedef {import('./readerGapPolicy.js').ReaderGapPolicy} ReaderGapPolicy */

/**
 * Φ schema-versioning — Phase 5: Layer 4 drift detector.
 *
 * Контракт зафиксирован в design-spec
 * `idf/docs/design/2026-04-26-phi-schema-versioning-spec.md` §4.5.
 * Связан с manifest v2.1 `drift-protection-spec.md` (Layer 4 из 4).
 *
 * Детектор runtime-проверяет reader-equivalence (§23 axiom 5):
 *
 *   «4 материализации pixels / voice / agent / document на одной legacy-slice
 *    Φ должны давать совпадающий gap-set (где-то поле missing → у всех или
 *    ни у кого, в пределах их scope)».
 *
 * Что детектор делает:
 *   1. Вычисляет canonical gap-set по world через scanEntityGaps (core).
 *   2. Принимает наблюдения от N reader'ов (gap-set'ы, как они их видят).
 *   3. Сравнивает: cells, где scope пересекается, должны иметь одинаковую
 *      gap-presence. Дивергенция → drift event.
 *
 * Что детектор **не** делает:
 *   - Не сравнивает rendered output (HTML vs SSML vs JSON — incomparable shapes).
 *   - Не проверяет equivalence ACTIONS (action может разниться по policy — это
 *     контракт). Проверяется gap-presence, не resolution.
 *   - Не вызывает reader'ы — observations передаются caller'ом (Phase 5 —
 *     scaffold; reader integrations добавятся в follow-up PRs).
 */

import { scanEntityGaps } from "./readerGapPolicy.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types (JSDoc)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} GapCell
 * @property {string} entity        — имя сущности
 * @property {string|number} entityId
 * @property {string} field
 * @property {GapDescriptor["kind"]} kind
 */

/**
 * Canonical gap-set: уникальные cells, где обнаружен gap по core-логике.
 * @typedef {Object} CanonicalGapSet
 * @property {GapCell[]} cells
 * @property {Map<string, GapCell>} byKey  — ключ = "entity:entityId:field" для O(1) lookup
 */

/**
 * Reader observation: что reader сообщает о gap-set'е (subset canonical'а).
 * @typedef {Object} ReaderObservation
 * @property {string} reader        — имя reader'а ("pixels", "voice", ...) или произвольный label
 * @property {GapCell[]} gapCells   — cells, где reader зафиксировал gap
 * @property {string[]} [scope]     — список ключей в scope reader'а (если scope частичный)
 */

/**
 * @typedef {Object} DriftEvent
 * @property {string} cellKey       — "entity:entityId:field"
 * @property {GapCell} cell
 * @property {string[]} agreeing    — список reader'ов, видящих gap
 * @property {string[]} disagreeing — список reader'ов в scope, НЕ видящих gap
 * @property {string} message       — человекочитаемое описание
 */

/**
 * @typedef {Object} EquivalenceReport
 * @property {boolean} equivalent     — true ↔ events.length === 0
 * @property {DriftEvent[]} events
 * @property {Object} summary
 * @property {number} summary.totalCells
 * @property {number} summary.driftCells
 * @property {Record<string, number>} summary.perReaderGapCount
 */

// ─────────────────────────────────────────────────────────────────────────────
// Canonical gap-set
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Уникальный ключ gap-cell'а — стабильный, упорядоченный.
 *
 * @param {string} entity
 * @param {string|number} entityId
 * @param {string} field
 * @returns {string}
 */
export function gapCellKey(entity, entityId, field) {
  return `${entity}:${String(entityId)}:${field}`;
}

/**
 * Вычислить canonical gap-set по world с использованием ontology fieldDefs.
 * Это «truth» против которой сравниваются observations.
 *
 * Стратегия:
 *   - Перебираем ontology.entities[X].fields.
 *   - Для каждой entity находим коллекцию в world (PascalCase / lowercase / typeMap).
 *   - Для каждого row × каждого fieldDef вызываем scanEntityGaps.
 *
 * @param {World} world
 * @param {Ontology} ontology
 * @param {{ typeMap?: Record<string, string> }} [opts]
 * @returns {CanonicalGapSet}
 */
export function computeCanonicalGapSet(world, ontology, opts = {}) {
  /** @type {GapCell[]} */
  const cells = [];
  /** @type {Map<string, GapCell>} */
  const byKey = new Map();

  if (!ontology?.entities || !world) return { cells, byKey };

  const typeMap = opts.typeMap ?? {};

  for (const [entityName, entityDef] of Object.entries(ontology.entities)) {
    const fieldDefs = entityDef?.fields;
    if (!fieldDefs || typeof fieldDefs !== "object") continue;

    const collection = resolveCollection(world, entityName, typeMap);
    if (!Array.isArray(collection) || collection.length === 0) continue;

    for (const row of collection) {
      const rowId = row?.id ?? null;
      if (rowId == null) continue;
      const gaps = scanEntityGaps(row, fieldDefs, { entity: entityName, world, typeMap });
      for (const g of gaps) {
        const cell = {
          entity: entityName,
          entityId: rowId,
          field: g.field ?? "",
          kind: g.kind,
        };
        const key = gapCellKey(cell.entity, cell.entityId, cell.field);
        if (!byKey.has(key)) {
          byKey.set(key, cell);
          cells.push(cell);
        }
      }
    }
  }

  return { cells, byKey };
}

/**
 * Найти collection в world по имени entity. Пробует:
 *   1. PascalCase ключ (core fold default)
 *   2. lowercase
 *   3. plural через typeMap
 *   4. simple +s / -y → -ies
 *
 * @param {World} world
 * @param {string} entityName
 * @param {Record<string, string>} typeMap
 * @returns {Array<Object> | null}
 */
function resolveCollection(world, entityName, typeMap) {
  const candidates = [];
  candidates.push(entityName);
  const lower = entityName.toLowerCase();
  candidates.push(lower);
  if (typeMap[lower]) candidates.push(typeMap[lower]);
  candidates.push(lower + "s");
  if (lower.endsWith("y")) candidates.push(lower.slice(0, -1) + "ies");

  for (const key of candidates) {
    const v = world[key];
    if (Array.isArray(v)) return v;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reader observations & comparison
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Превратить ReaderObservation в Map<cellKey, GapCell>.
 *
 * @param {ReaderObservation} observation
 * @returns {Map<string, GapCell>}
 */
function observationToMap(observation) {
  const map = new Map();
  if (!observation || !Array.isArray(observation.gapCells)) return map;
  for (const cell of observation.gapCells) {
    if (!cell || typeof cell !== "object") continue;
    const key = gapCellKey(cell.entity, cell.entityId, cell.field);
    map.set(key, cell);
  }
  return map;
}

/**
 * Превратить scope-список в Set ключей. Если scope не задан — null
 * (означает «reader видит ВСЁ — equivalence требуется по всему canonical'у»).
 *
 * @param {ReaderObservation} observation
 * @returns {Set<string> | null}
 */
function observationScope(observation) {
  if (!observation || !Array.isArray(observation.scope)) return null;
  return new Set(observation.scope);
}

/**
 * Сравнить N reader observations против canonical gap-set'а. Каждая cell,
 * присутствующая в scope ≥ 2 reader'ов, проверяется на consistency: либо
 * все согласные reader'ы видят gap, либо никто.
 *
 * Drift event генерируется когда среди reader'ов в scope наблюдается
 * дивергенция «один видит, другой нет».
 *
 * @param {CanonicalGapSet} canonical
 * @param {ReaderObservation[]} observations
 * @returns {EquivalenceReport}
 */
export function compareReaderObservations(canonical, observations) {
  if (!canonical || !Array.isArray(canonical.cells)) {
    throw new Error("compareReaderObservations: canonical gap-set is required");
  }
  if (!Array.isArray(observations)) {
    throw new Error("compareReaderObservations: observations[] is required");
  }

  const observationMaps = observations.map(o => ({
    reader: o?.reader ?? "unnamed",
    map: observationToMap(o),
    scope: observationScope(o),
  }));

  /** @type {DriftEvent[]} */
  const events = [];

  // Объединённый набор всех cell-ключей: canonical ∪ всех observations.
  // Для каждого ключа проверяем consistency среди reader'ов в scope.
  const allKeys = new Set(canonical.byKey.keys());
  for (const o of observationMaps) {
    for (const k of o.map.keys()) allKeys.add(k);
  }

  for (const key of allKeys) {
    const inScopeReaders = observationMaps.filter(o => o.scope === null || o.scope.has(key));
    if (inScopeReaders.length < 2) continue;

    const agreeing = [];
    const disagreeing = [];
    for (const o of inScopeReaders) {
      if (o.map.has(key)) agreeing.push(o.reader);
      else disagreeing.push(o.reader);
    }

    if (agreeing.length > 0 && disagreeing.length > 0) {
      const cell = canonical.byKey.get(key) ?? inScopeReaders.find(o => o.map.has(key))?.map.get(key);
      if (!cell) continue;
      events.push({
        cellKey: key,
        cell,
        agreeing,
        disagreeing,
        message: `gap-cell ${key} (kind=${cell.kind}) seen by [${agreeing.join(", ")}] but missed by [${disagreeing.join(", ")}]`,
      });
    }
  }

  /** @type {Record<string, number>} */
  const perReaderGapCount = {};
  for (const o of observationMaps) {
    perReaderGapCount[o.reader] = o.map.size;
  }

  return {
    equivalent: events.length === 0,
    events,
    summary: {
      totalCells: canonical.byKey.size,
      driftCells: events.length,
      perReaderGapCount,
    },
  };
}

/**
 * Удобная композиция: вычислить canonical gap-set + сравнить observations.
 *
 * @param {World} world
 * @param {Ontology} ontology
 * @param {ReaderObservation[]} observations
 * @param {{ typeMap?: Record<string, string> }} [opts]
 * @returns {EquivalenceReport}
 */
export function detectReaderEquivalenceDrift(world, ontology, observations, opts = {}) {
  const canonical = computeCanonicalGapSet(world, ontology, opts);
  return compareReaderObservations(canonical, observations);
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: построить «mock» observations для self-test
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Сгенерировать «perfect» observation, которое ВИДИТ весь canonical gap-set.
 * Полезно для test fixtures и self-проверок: equivalent ↔ true для двух
 * одинаковых observation'ов.
 *
 * @param {string} reader
 * @param {CanonicalGapSet} canonical
 * @returns {ReaderObservation}
 */
export function buildPerfectObservation(reader, canonical) {
  return {
    reader,
    gapCells: canonical.cells.slice(),
  };
}
