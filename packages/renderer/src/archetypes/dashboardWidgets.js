/**
 * Чистые хелперы для Dashboard-виджетов: парсер aggregate-DSL, фильтры,
 * нормализация имён коллекций, форматирование и сортировка.
 *
 * Aggregate-синтаксис:
 *   sum(collection, field [, filterExpr...])
 *   avg(collection, field [, filterExpr...])
 *   count(collection [, filterExpr...])
 *
 * filterExpr: `field <op> <value>`, op ∈ {=, !=, >, <, >=, <=}.
 * value: число | 'строка' | "строка" | viewer.x | today | now | true | false | null | bare
 */
import { resolve } from "../eval.js";

export function toCollection(entity) {
  if (!entity) return null;
  const lower = entity[0].toLowerCase() + entity.slice(1);
  if (lower.endsWith("s")) return lower + "es";
  if (lower.endsWith("y")) return lower.slice(0, -1) + "ies";
  return lower + "s";
}

export function splitArgs(s) {
  return s.split(",").map(x => x.trim()).filter(Boolean);
}

export function parseAggregate(expr) {
  const m = /^(sum|count|avg)\(([^)]+)\)$/i.exec(String(expr || "").trim());
  if (!m) return null;
  const op = m[1].toLowerCase();
  const parts = splitArgs(m[2]);
  const collection = parts[0];
  if (op === "count") return { op, collection, field: null, filters: parts.slice(1) };
  return { op, collection, field: parts[1], filters: parts.slice(2) };
}

export function resolveRhs(raw, viewer) {
  const t = String(raw).trim();
  if (t === "today") { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  if (t === "now") return Date.now();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (t.startsWith("viewer.")) return resolve(viewer, t.slice("viewer.".length));
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const q = /^['"]([^'"]*)['"]$/.exec(t);
  if (q) return q[1];
  return t;
}

export function matchFilter(row, expr, viewer) {
  const m = /^(\w+)\s*(>=|<=|!=|>|<|=)\s*(.+)$/.exec(expr.trim());
  if (!m) return true;
  const [, field, op, rhsRaw] = m;
  const lhs = row[field];
  const rhs = resolveRhs(rhsRaw, viewer);
  switch (op) {
    case "=":  return lhs == rhs;
    case "!=": return lhs != rhs;
    case ">=": return lhs >= rhs;
    case "<=": return lhs <= rhs;
    case ">":  return lhs > rhs;
    case "<":  return lhs < rhs;
    default:   return true;
  }
}

export function evalAggregate(spec, { world, viewer }) {
  if (!spec || !world) return null;
  const rows = world[spec.collection] || [];
  const filtered = rows.filter(r => spec.filters.every(f => matchFilter(r, f, viewer)));
  if (spec.op === "count") return filtered.length;
  if (spec.op === "sum")   return filtered.reduce((s, r) => s + (Number(r[spec.field]) || 0), 0);
  if (spec.op === "avg") {
    if (filtered.length === 0) return 0;
    return filtered.reduce((s, r) => s + (Number(r[spec.field]) || 0), 0) / filtered.length;
  }
  return null;
}

export function formatScalar(v, field) {
  if (v == null) return "—";
  if (typeof v !== "number") return String(v);
  if (!Number.isFinite(v)) return "—";
  if (field === "rating") return v.toFixed(2);
  if (Number.isInteger(v)) return v.toLocaleString("ru-RU");
  return v.toFixed(2);
}

export function sortItems(items, sortSpec) {
  const [field, dir] = String(sortSpec).split(":");
  const mul = dir === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = a?.[field], bv = b?.[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return -1 * mul;
    if (av > bv) return 1 * mul;
    return 0;
  });
}
