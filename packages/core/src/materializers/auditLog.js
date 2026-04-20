/**
 * auditLog — 5-я производная материализация: аудиторский view над Φ.
 *
 * В отличие от document/voice/pixel materializer'ов, это НЕ рендер проекции —
 * это прямой materializer над сырым effect-log'ом Φ. Каждая запись —
 * confirmed effect, обогащённый полями из `effect.context.__audit`.
 *
 * Использование в compliance-домене (SOX ICFR, 13-й полевой тест):
 *  - auditor-роль видит audit_log-projection поверх этой функции;
 *  - reader-equivalence (§23 axiom 5): тот же log → document-materialization
 *    (quarterly 10-Q exhibit) и voice-materialization (CFO briefing), без
 *    parallel truth.
 *
 * `buildAuditContext` — helper для host-валидатора. Производит канонический
 * `__audit` блок при commit'е confirmed effect'а; нужен, чтобы auditor-view
 * имел полный проenance без reverse-inference.
 */

// ── fnv-1a 32bit — простой стабильный hash, достаточный для идентификации
//    effect'а в auditor-UI (не криптоподпись).

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function canonicalStringify(obj) {
  if (obj == null) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalStringify).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalStringify(obj[k])).join(",") + "}";
}

// ── filter helpers

function matchTimeRange(ts, range) {
  if (!range) return true;
  if (range.from != null && ts < range.from) return false;
  if (range.to   != null && ts > range.to)   return false;
  return true;
}

function matchArrayFilter(value, arr) {
  if (!Array.isArray(arr) || arr.length === 0) return true;
  return arr.includes(value);
}

function matchRuleId(auditCtx, ruleId) {
  if (!ruleId) return true;
  return Array.isArray(auditCtx?.ruleIds) && auditCtx.ruleIds.includes(ruleId);
}

// ── enrichment

function enrich(effect) {
  const a = effect?.context?.__audit || {};
  return {
    id:           effect.id,
    timestamp:    effect.timestamp,
    actor:        effect.actor,
    type:         effect.type,
    entityKind:   effect.entityKind,
    entityId:     effect.entityId,
    sourceIntent: a.sourceIntent ?? effect.type,
    ruleIds:      Array.isArray(a.ruleIds)      ? a.ruleIds      : [],
    witnessChain: Array.isArray(a.witnessChain) ? a.witnessChain : [],
    evidenceIds:  Array.isArray(a.evidenceIds)  ? a.evidenceIds  : [],
    auditHash:    a.auditHash,
  };
}

/**
 * materializeAuditLog(phi, filter?) → AuditEntry[]
 *
 * phi:    { effects: [...] } — append-only Φ-лог (status ∈ {proposed|confirmed|rejected})
 * filter: { actorId?, timeRange?: {from, to}, intentTypes?: [],
 *           entityKind?, entityId?, ruleId? }
 *
 * Возвращает только confirmed effect'ы, применяет фильтры, обогащает
 * через __audit. Чистая функция, idempotent.
 */
export function materializeAuditLog(phi, filter = {}) {
  const effects = Array.isArray(phi?.effects) ? phi.effects : [];
  return effects
    .filter(e => e.status === "confirmed")
    .filter(e => !filter.actorId || e.actor === filter.actorId)
    .filter(e => matchTimeRange(e.timestamp, filter.timeRange))
    .filter(e => matchArrayFilter(e.type,     filter.intentTypes))
    .filter(e => !filter.entityKind || e.entityKind === filter.entityKind)
    .filter(e => !filter.entityId   || e.entityId   === filter.entityId)
    .filter(e => matchRuleId(e.context?.__audit, filter.ruleId))
    .map(enrich);
}

/**
 * buildAuditContext({ intent, actor, timestamp, ruleIds?, evidenceIds?, witnessChain? })
 *
 * Строит канонический `__audit` блок для вставки в `effect.context.__audit`.
 * Поля — documented в auditLog.js-шапке. `auditHash` — fnv1a над
 * canonical-json всего контента; даёт стабильный идентификатор effect'а
 * для cross-reference в auditor-UI. Порядок элементов в ruleIds/evidenceIds
 * значим — hash его отражает (authored ordering — authoritative).
 */
export function buildAuditContext({
  intent, actor, timestamp,
  ruleIds, evidenceIds, witnessChain,
}) {
  const base = {
    sourceIntent: intent,
    ruleIds:      ruleIds      ?? [],
    evidenceIds:  evidenceIds  ?? [],
    witnessChain: witnessChain ?? [],
  };
  const canonical = canonicalStringify({ ...base, actor, timestamp });
  return { ...base, auditHash: "fnv1a:" + fnv1a(canonical) };
}
