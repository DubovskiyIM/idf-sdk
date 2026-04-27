/** @typedef {import('../types/idf.d.ts').Ontology} Ontology */

/**
 * Φ schema-versioning — Phase 2: ontology.evolution[] append-only лог.
 *
 * Контракт зафиксирован в design-spec
 * `idf/docs/design/2026-04-26-phi-schema-versioning-spec.md` §4.2.
 * Backlog item: idf/docs/backlog.md §2.8.
 *
 * Лог хранится прямо в онтологии (`ontology.evolution: OntologyVersion[]`)
 * и описывает череду изменений: каждый entry знает свой `hash`, `parentHash`,
 * timestamp, author, structural diff и (с Phase 3) — массив `upcasters`.
 *
 * Этот модуль предоставляет:
 *   - типы / shape OntologyVersion и DiffShape (через JSDoc)
 *   - getEvolutionLog(ontology)            — safe read
 *   - getCurrentVersionHash(ontology)      — последний entry или null
 *   - findVersionByHash(ontology, hash)    — locate entry
 *   - getAncestry(ontology, hash)          — chain от root до hash
 *   - validateEvolutionEntry(entry)        — shape-check без throw
 *   - addEvolutionEntry(ontology, entry)   — pure, возвращает копию ontology
 *   - emptyDiff()                          — фабрика «нет изменений»
 *   - createEvolutionEntry(args)           — convenience constructor
 *
 * Phase 3 подключит Upcaster execution поверх этой структуры.
 */

/**
 * @typedef {Object} EvolutionDiff
 * @property {Array<{ entity: string, field: string, default?: unknown }>} [addedFields]
 * @property {Array<{ entity: string, field: string }>} [removedFields]
 * @property {Array<{ entity: string, from: string, to: string }>} [renamedFields]
 * @property {Array<{ entity: string, field: string, mapping: Record<string, string | null> }>} [enumChanges]
 * @property {Array<{ from: string, into: string[], discriminator: string }>} [splitEntities]
 * @property {Array<{ role: string, diff: unknown }>} [roleChanges]
 * @property {string[]} [invariantsAdded]
 * @property {string[]} [invariantsRemoved]
 */

/**
 * @typedef {Object} OntologyVersion
 * @property {string} hash               14-char hex (см. hashOntology)
 * @property {string | null} parentHash  null для root entry
 * @property {string} timestamp          ISO-8601
 * @property {string} authorId
 * @property {EvolutionDiff} diff
 * @property {Array<unknown>} [upcasters] — declarative + functional steps (Phase 3)
 */

/**
 * Безопасно прочитать evolution-лог. Никогда не throw, всегда возвращает массив.
 *
 * @param {Ontology | null | undefined} ontology
 * @returns {OntologyVersion[]}
 */
export function getEvolutionLog(ontology) {
  if (!ontology || typeof ontology !== "object") return [];
  const log = ontology.evolution;
  return Array.isArray(log) ? log : [];
}

/**
 * Хэш текущей (последней) версии онтологии в логе.
 * null если лог пуст.
 *
 * @param {Ontology | null | undefined} ontology
 * @returns {string | null}
 */
export function getCurrentVersionHash(ontology) {
  const log = getEvolutionLog(ontology);
  if (log.length === 0) return null;
  const last = log[log.length - 1];
  return typeof last?.hash === "string" ? last.hash : null;
}

/**
 * Найти entry по hash. null если не найдено.
 *
 * @param {Ontology | null | undefined} ontology
 * @param {string} hash
 * @returns {OntologyVersion | null}
 */
export function findVersionByHash(ontology, hash) {
  if (typeof hash !== "string" || hash.length === 0) return null;
  const log = getEvolutionLog(ontology);
  for (const entry of log) {
    if (entry?.hash === hash) return entry;
  }
  return null;
}

/**
 * Цепочка предков от root до данной версии (включительно).
 * Пустой массив если hash не найден или цепочка разорвана.
 * Защищён от циклов: max 1000 шагов, дальше — безопасная остановка.
 *
 * @param {Ontology | null | undefined} ontology
 * @param {string} hash
 * @returns {OntologyVersion[]}
 */
export function getAncestry(ontology, hash) {
  const result = [];
  let current = findVersionByHash(ontology, hash);
  const seen = new Set();
  let safety = 0;
  while (current && !seen.has(current.hash) && safety < 1000) {
    seen.add(current.hash);
    result.unshift(current);
    if (current.parentHash == null) break;
    current = findVersionByHash(ontology, current.parentHash);
    safety++;
  }
  // Если цепочка не закончилась null parentHash'ом — она разорвана; root не достигнут.
  if (result.length === 0) return [];
  if (result[0].parentHash != null) return [];
  return result;
}

/**
 * Пустой diff — для root entry или промежуточных шагов без структурных изменений.
 *
 * @returns {EvolutionDiff}
 */
export function emptyDiff() {
  return {
    addedFields: [],
    removedFields: [],
    renamedFields: [],
    enumChanges: [],
    splitEntities: [],
    roleChanges: [],
    invariantsAdded: [],
    invariantsRemoved: [],
  };
}

/**
 * Shape-check для evolution entry. Возвращает массив строк-ошибок (пустой = ok).
 * Не throw'ает — caller сам решает, что делать с нарушениями.
 *
 * Проверяется:
 *   - наличие обязательных полей: hash, parentHash (string | null), timestamp, authorId, diff
 *   - hash и timestamp — непустые строки
 *   - parentHash — string | null (не undefined, не number)
 *   - diff — object
 *   - массивы внутри diff — массивы или undefined
 *   - upcasters — массив или undefined
 *
 * @param {unknown} entry
 * @returns {string[]} errors (empty = valid)
 */
export function validateEvolutionEntry(entry) {
  const errs = [];
  if (!entry || typeof entry !== "object") {
    return ["entry must be an object"];
  }
  const e = /** @type {Record<string, unknown>} */ (entry);

  if (typeof e.hash !== "string" || e.hash.length === 0) {
    errs.push("hash must be a non-empty string");
  }
  if (e.parentHash !== null && typeof e.parentHash !== "string") {
    errs.push("parentHash must be string or null");
  }
  if (typeof e.timestamp !== "string" || e.timestamp.length === 0) {
    errs.push("timestamp must be a non-empty ISO-8601 string");
  }
  if (typeof e.authorId !== "string" || e.authorId.length === 0) {
    errs.push("authorId must be a non-empty string");
  }
  if (!e.diff || typeof e.diff !== "object" || Array.isArray(e.diff)) {
    errs.push("diff must be an object");
  } else {
    const d = /** @type {Record<string, unknown>} */ (e.diff);
    const arrayKeys = [
      "addedFields",
      "removedFields",
      "renamedFields",
      "enumChanges",
      "splitEntities",
      "roleChanges",
      "invariantsAdded",
      "invariantsRemoved",
    ];
    for (const k of arrayKeys) {
      if (d[k] !== undefined && !Array.isArray(d[k])) {
        errs.push(`diff.${k} must be an array if present`);
      }
    }
  }
  if (e.upcasters !== undefined && !Array.isArray(e.upcasters)) {
    errs.push("upcasters must be an array if present");
  }

  return errs;
}

/**
 * Append entry в `ontology.evolution[]`. Pure: возвращает новый объект ontology.
 *
 * Inariants:
 *   - entry должен пройти validateEvolutionEntry (иначе throw — это design-time
 *     операция, и тихо проглатывать ошибку нельзя).
 *   - entry.parentHash должен совпадать с getCurrentVersionHash(ontology),
 *     иначе цепочка ломается. Для пустого лога parentHash должен быть null.
 *   - entry.hash не должен дублировать существующий.
 *
 * @param {Ontology} ontology
 * @param {OntologyVersion} entry
 * @returns {Ontology} новая копия с добавленным entry
 */
export function addEvolutionEntry(ontology, entry) {
  const errs = validateEvolutionEntry(entry);
  if (errs.length > 0) {
    throw new Error(`addEvolutionEntry: invalid entry — ${errs.join("; ")}`);
  }

  const log = getEvolutionLog(ontology);
  const currentHash = log.length === 0 ? null : log[log.length - 1].hash;

  if (entry.parentHash !== currentHash) {
    throw new Error(
      `addEvolutionEntry: parentHash mismatch — expected ${currentHash === null ? "null" : `"${currentHash}"`}, got ${
        entry.parentHash === null ? "null" : `"${entry.parentHash}"`
      }`,
    );
  }

  if (findVersionByHash(ontology, entry.hash)) {
    throw new Error(`addEvolutionEntry: hash "${entry.hash}" already present in evolution log`);
  }

  return { ...ontology, evolution: [...log, entry] };
}

/**
 * Convenience constructor для evolution entry. Заполняет defaults.
 *
 * @param {Object} args
 * @param {string} args.hash
 * @param {string | null} args.parentHash
 * @param {string} args.authorId
 * @param {string} [args.timestamp] — ISO-8601, default = new Date().toISOString()
 * @param {Partial<EvolutionDiff>} [args.diff]
 * @param {Array<unknown>} [args.upcasters]
 * @returns {OntologyVersion}
 */
export function createEvolutionEntry({ hash, parentHash, authorId, timestamp, diff, upcasters }) {
  return {
    hash,
    parentHash: parentHash ?? null,
    timestamp: timestamp ?? new Date().toISOString(),
    authorId,
    diff: { ...emptyDiff(), ...(diff || {}) },
    ...(upcasters !== undefined ? { upcasters } : {}),
  };
}
