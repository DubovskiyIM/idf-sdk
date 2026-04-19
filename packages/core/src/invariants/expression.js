/**
 * Invariant kind: "expression" (backlog 1.2).
 *
 * Row-level custom predicate: для каждой row в entity-collection
 * ожидается, что `predicate(row)` вернёт truthy. Нарушение → violation.
 *
 * Параметры:
 *   entity: "Deal"
 *   predicate: function(row) → boolean   # предпочтительно; чистая функция
 *   expression: string                    # fallback: простой JS-expr над row,
 *                                         # парсится safeEvalExpression
 *   message?: string                      # человеческий текст violation'а
 *   where?: { field: value }              # опциональный фильтр (как cardinality)
 *
 * Пример:
 *   {
 *     kind: "expression", name: "no-self-deal", entity: "Deal",
 *     predicate: (r) => r.customerId !== r.executorId,
 *     message: "customerId !== executorId"
 *   }
 *
 * NB: строковые expression'ы парсятся как JS Function — авторы ontology
 * полностью доверенные, это не user-input. Альтернатива (AST-based safe
 * evaluator) — отдельный backlog-пункт.
 */

function pluralize(e) {
  const l = e.toLowerCase();
  if (l.endsWith("s")) return l + "es";
  if (l.endsWith("y")) return l.slice(0, -1) + "ies";
  return l + "s";
}

function matchesWhere(row, where) {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (row[k] !== v) return false;
  }
  return true;
}

function compilePredicate(inv) {
  if (typeof inv.predicate === "function") return inv.predicate;
  if (typeof inv.expression === "string") {
    // Для авторской декларации: expression — JS-выражение над row.
    // new Function — единственный способ без рантайм-AST (который требует
    // отдельного parser'а). Вход — trusted ontology.
    return new Function("row", `with (row) { return (${inv.expression}); }`);
  }
  throw new Error("expression invariant requires predicate or expression");
}

function handler(inv, world) {
  if (!inv.entity) {
    throw new Error("expression invariant requires .entity");
  }
  const rows = (world[pluralize(inv.entity)] || []).filter(r => matchesWhere(r, inv.where));
  const predicate = compilePredicate(inv);
  const violations = [];

  for (const row of rows) {
    let ok;
    try {
      ok = predicate(row);
    } catch (e) {
      // Ошибка внутри предиката трактуется как нарушение — чтобы автор
      // получил видимый сигнал, а не «тихо всё ок».
      violations.push({
        message: `${inv.entity}#${row.id}: предикат упал: ${e.message}`,
        details: { entity: inv.entity, id: row.id, reason: "predicate_threw",
                   error: String(e) },
      });
      continue;
    }
    if (!ok) {
      violations.push({
        message: inv.message
          ? `${inv.entity}#${row.id}: ${inv.message}`
          : `${inv.entity}#${row.id}: предикат не выполнен`,
        details: { entity: inv.entity, id: row.id, reason: "predicate_false" },
      });
    }
  }

  return violations;
}

export { handler };
