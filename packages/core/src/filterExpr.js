/**
 * evalFilter — универсальный вычислитель projection.filter.
 *
 * Форматы, которые эмитят R-правила crystallize_v2:
 *
 *   (a) legacy string — JS-выражение, где поля row доступны как именованные
 *       аргументы, а viewer/world — через context. Используется в messenger
 *       buildBody, любых authored filter.
 *
 *   (b) { field, op, value } — простой predicate (R3b singleton, R11 v2 feed).
 *       value может быть "me.id" → резолвится в viewer.id.
 *
 *   (c) { kind: "disjunction", fields, op, value } — OR across полей
 *       (R7b multi-ownerField catalog).
 *
 *   (d) { kind: "m2m-via", via, viewerField, joinField, localField,
 *         statusField?, statusAllowed? } — проверка через bridge-коллекцию
 *       (R10 role.scope). Требует ctx.world.
 *
 * Возвращает boolean. null/undefined filter → true (row проходит).
 * ctx = { viewer, world } — оба опциональны для (a)/(b) без "me.*", но
 * "me.id" без viewer → false (защитное поведение, не true).
 */

function resolveValue(value, ctx) {
  if (typeof value !== "string") return value;
  if (value === "me.id") {
    const id = ctx?.viewer?.id;
    return id === undefined ? Symbol.for("filterExpr/unresolved") : id;
  }
  // Пространство "me.*" зарезервировано под расширение (me.role, me.orgId).
  // Сейчас поддержан только me.id; остальные возвращаются как есть.
  return value;
}

function compareOp(a, op, b) {
  // Если resolved value — unresolved sentinel → никогда не matches.
  if (b === Symbol.for("filterExpr/unresolved")) return false;
  switch (op) {
    case "=":
    case "==":
    case "===": return a === b;
    case "!=":
    case "!==": return a !== b;
    case ">": return a > b;
    case "<": return a < b;
    case ">=": return a >= b;
    case "<=": return a <= b;
    case "in": return Array.isArray(b) ? b.includes(a) : false;
    default: return false;
  }
}

function evalStringExpr(expr, row, ctx) {
  try {
    const keys = Object.keys(row);
    const fn = new Function(...keys, "viewer", "world", "viewState",
      `return !!(${expr})`);
    return fn(
      ...keys.map(k => row[k]),
      ctx?.viewer,
      ctx?.world,
      ctx?.viewState,
    );
  } catch {
    return true; // permissive fallback — author's DSL не должен блокировать UI
  }
}

function evalSimple(filter, row, ctx) {
  const { field, op, value } = filter;
  if (!field || !op) return true;
  const resolved = resolveValue(value, ctx);
  return compareOp(row[field], op, resolved);
}

function evalDisjunction(filter, row, ctx) {
  const { fields, op, value } = filter;
  if (!Array.isArray(fields) || fields.length === 0) return false;
  const resolved = resolveValue(value, ctx);
  return fields.some(f => compareOp(row[f], op, resolved));
}

function evalM2mVia(filter, row, ctx) {
  const { via, viewerField, joinField, localField, statusField, statusAllowed } = filter;
  const world = ctx?.world;
  const viewerId = ctx?.viewer?.id;
  if (!world || !viewerId) return false;
  const bridge = world[via];
  if (!Array.isArray(bridge) || bridge.length === 0) return false;

  const allowStatusSet = Array.isArray(statusAllowed) && statusAllowed.length > 0
    ? new Set(statusAllowed) : null;

  const target = row?.[localField];
  if (target == null) return false;

  for (const m of bridge) {
    if (m[viewerField] !== viewerId) continue;
    if (allowStatusSet && statusField && !allowStatusSet.has(m[statusField])) continue;
    if (m[joinField] === target) return true;
  }
  return false;
}

export function evalFilter(filter, row, ctx = {}) {
  if (filter == null) return true;
  if (typeof filter === "string") return evalStringExpr(filter, row, ctx);
  if (typeof filter !== "object") return true;

  switch (filter.kind) {
    case "disjunction": return evalDisjunction(filter, row, ctx);
    case "m2m-via": return evalM2mVia(filter, row, ctx);
    default:
      // Без kind → простой { field, op, value }
      return evalSimple(filter, row, ctx);
  }
}
