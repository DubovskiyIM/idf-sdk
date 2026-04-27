/**
 * patternKey — formal composite-key API для глобально уникальной
 * идентификации pattern'ов между bank'ами (closes idf backlog §13.1).
 *
 * Проблема. `pattern.id` не глобально уникален: один и тот же паттерн
 * может одновременно быть в `stable/<arch>/<id>.js` и в
 * `candidate/<source>-<id>.json` (как «новое наблюдение в другом
 * продукте»). Plain `id`-lookup ломается, FK collisions в Φ.
 *
 * Решение. Composite-ключ:
 *   stable      → `stable__<id>`
 *   candidate   → `candidate__<id>__<sourceProduct?>`
 *   anti        → `anti__<id>`
 *
 * `sourceProduct` опционален: если паттерн исследовали из конкретного
 * продукта (avito / profi / notion / coda / …), он включается в key.
 * Для legacy candidate'ов без sourceProduct ключ degraded к `candidate__<id>`,
 * но автор должен мигрировать на формальное поле.
 *
 * Helpers:
 *   - patternKey(p) — caller-facing canonical key
 *   - isSameLogicalPattern(a, b) — logical equality (один и тот же
 *     паттерн в разных bank'ах имеет одинаковый logical-id)
 *   - findPatternByKey(patterns, key) — collection lookup
 *   - parsePatternKey(key) — обратная декомпозиция → {status, id, sourceProduct}
 *   - logicalId(p) — bare id без status/source prefix (для grouping)
 */

const STATUS_PREFIX = new Set(["stable", "candidate", "anti"]);

export function logicalId(pattern) {
  if (!pattern || typeof pattern !== "object") return null;
  return pattern.id || pattern.patternId || null;
}

export function patternKey(pattern) {
  const id = logicalId(pattern);
  if (!id) return null;
  const status = pattern.status || "stable";
  const safeStatus = STATUS_PREFIX.has(status) ? status : "stable";
  if (safeStatus === "candidate" && pattern.sourceProduct) {
    return `${safeStatus}__${id}__${pattern.sourceProduct}`;
  }
  return `${safeStatus}__${id}`;
}

export function isSameLogicalPattern(a, b) {
  if (!a || !b) return false;
  return logicalId(a) === logicalId(b);
}

export function findPatternByKey(patterns, key) {
  if (!Array.isArray(patterns) || !key) return null;
  for (const p of patterns) {
    if (patternKey(p) === key) return p;
  }
  return null;
}

export function parsePatternKey(key) {
  if (typeof key !== "string") return null;
  const parts = key.split("__");
  if (parts.length < 2) return null;
  const [status, id, ...rest] = parts;
  if (!STATUS_PREFIX.has(status)) return null;
  return {
    status,
    id,
    sourceProduct: rest.length > 0 ? rest.join("__") : null,
  };
}
