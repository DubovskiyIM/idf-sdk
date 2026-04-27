/** @typedef {import('../types/idf.d.ts').Effect} Effect */
/** @typedef {import('../types/idf.d.ts').Ontology} Ontology */

/**
 * Φ schema-versioning — Phase 0 фундамент.
 *
 * Контракт зафиксирован в design-spec
 * `idf/docs/design/2026-04-26-phi-schema-versioning-spec.md`.
 * Backlog item: idf/docs/backlog.md §2.8.
 *
 * Этот модуль — pure helpers, без поведенческих изменений в fold:
 *   - getSchemaVersion(effect)        — читает effect.context.schemaVersion
 *   - tagWithSchemaVersion(effect, v) — pure, не мутирует
 *   - hashOntology(ontology)          — стабильный детерминированный хэш
 *   - UNKNOWN_SCHEMA_VERSION          — sentinel для legacy effects
 *
 * Phase 1 (server tagging) и Phase 3 (upcasters) подключатся поверх,
 * не ломая backward-compat: legacy effect без schemaVersion трактуется
 * как `UNKNOWN_SCHEMA_VERSION` — «применять текущую онтологию без upcast».
 */

export const UNKNOWN_SCHEMA_VERSION = "unknown";

/**
 * Извлечь schemaVersion из эффекта. Если эффект legacy (без поля) —
 * вернуть UNKNOWN_SCHEMA_VERSION. Никогда не throw.
 *
 * @param {Effect | null | undefined} effect
 * @returns {string}
 */
export function getSchemaVersion(effect) {
  if (!effect || typeof effect !== "object") return UNKNOWN_SCHEMA_VERSION;
  const ctx = effect.context;
  if (!ctx || typeof ctx !== "object") return UNKNOWN_SCHEMA_VERSION;
  const v = ctx.schemaVersion;
  return typeof v === "string" && v.length > 0 ? v : UNKNOWN_SCHEMA_VERSION;
}

/**
 * Вернуть копию эффекта с проставленным schemaVersion в context.
 * Pure — не мутирует input. Если version пустой/falsy — возвращает оригинал.
 *
 * @param {Effect} effect
 * @param {string} version
 * @returns {Effect}
 */
export function tagWithSchemaVersion(effect, version) {
  if (!effect || typeof effect !== "object") return effect;
  if (typeof version !== "string" || version.length === 0) return effect;
  const ctx = effect.context && typeof effect.context === "object"
    ? { ...effect.context, schemaVersion: version }
    : { schemaVersion: version };
  return { ...effect, context: ctx };
}

/**
 * Канонизировать значение для стабильной сериализации.
 * Object keys сортируются лексикографически. Массивы сохраняют порядок.
 * Предполагается JSON-совместимость (без Date/RegExp/Map/Set/функций).
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    out[key] = canonicalize(value[key]);
  }
  return out;
}

/**
 * cyrb53 — 53-bit non-cryptographic hash. Детерминированный, sync, pure JS.
 * Возвращает unsigned int 0 .. 2^53-1. Используется как стабильный fingerprint
 * канонизированной онтологии. Спецификация — для cross-stack соответствия:
 *
 *   h1 = 0xdeadbeef ^ seed
 *   h2 = 0x41c6ce57 ^ seed
 *   for ch in str: h1 = imul(h1 ^ ch, 2654435761); h2 = imul(h2 ^ ch, 1597334677)
 *   h1 = imul(h1 ^ (h1 >>> 16), 2246822507) ^ imul(h2 ^ (h2 >>> 13), 3266489909)
 *   h2 = imul(h2 ^ (h2 >>> 16), 2246822507) ^ imul(h1 ^ (h1 >>> 13), 3266489909)
 *   return 4294967296 * (h2 & 0x1fffff) + (h1 >>> 0)
 *
 * Cross-stack импл'ы (idf-go / idf-rust / idf-swift) обязаны соблюдать тот же
 * алгоритм. Замена на SHA-256 — отдельный versioning-event самой hash-функции.
 *
 * @param {string} str
 * @param {number} [seed=0]
 * @returns {number}
 */
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (h2 & 0x1fffff) + (h1 >>> 0);
}

/**
 * Стабильный детерминированный хэш онтологии.
 *
 * Алгоритм:
 *   1. canonicalize(ontology) — рекурсивно сортируем ключи объектов.
 *   2. JSON.stringify канонизированной формы.
 *   3. cyrb53 → hex (зеро-pad до 14 chars).
 *
 * Свойства:
 *   - Детерминирован: одна онтология → один хэш, всегда.
 *   - Order-independent для object keys (важно — JSON ordering непредсказуем
 *     при ручном редактировании авторами в Studio).
 *   - Cross-stack reproducible: алгоритм формализован выше для go/rust/swift.
 *   - Не криптографический: collision-resistant в пределах 2^26 онтологий
 *     (день рождения), что покрывает любой реалистичный tenant.
 *
 * @param {Ontology | null | undefined} ontology
 * @returns {string} 14-character hex string
 */
export function hashOntology(ontology) {
  if (ontology == null) return "0".repeat(14);
  const canonical = canonicalize(ontology);
  const serialized = JSON.stringify(canonical);
  const h = cyrb53(serialized, 0);
  return h.toString(16).padStart(14, "0");
}
