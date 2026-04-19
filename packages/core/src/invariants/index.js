/**
 * Global invariants checker — ∀-свойства world-state после fold(Φ).
 *
 * Контракт: ontology.invariants — массив { name, kind, severity?, ... }.
 * Dispatch по kind, каждый handler возвращает массив violations.
 *
 * Возврат: { ok: bool, violations: [{name, kind, severity, message, details}] }.
 * ok=false только если есть хотя бы один violation с severity:"error".
 *
 * Пустые/отсутствующие invariants → ok:true, пустой violations.
 *
 * Schema-drift policy (v1.13 backlog 1.1):
 *  - unknown_kind / unsupported_shape / handler_threw → severity:"warning",
 *    даже если автор декларировал severity:"error". Это предотвращает
 *    каскадный rollback effect'а на чисто schema-mismatch.
 *
 * См. план: docs/superpowers/plans/2026-04-14-global-invariants.md
 */

import { handler as roleCapability } from "./roleCapability.js";
import { handler as referential }    from "./referential.js";
import { handler as transition }     from "./transition.js";
import { handler as cardinality }    from "./cardinality.js";
import { handler as aggregate }      from "./aggregate.js";
import { handler as expression }     from "./expression.js";
import { normalizeInvariant }        from "./normalize.js";

const KIND_HANDLERS = {
  "role-capability": roleCapability,
  "referential":     referential,
  "transition":      transition,
  "cardinality":     cardinality,
  "aggregate":       aggregate,
  "expression":      expression,
};

function registerKind(name, handler) {
  KIND_HANDLERS[name] = handler;
}

function checkInvariants(world, ontology, opts = {}) {
  const invariants = Array.isArray(ontology?.invariants) ? ontology.invariants : [];
  const violations = [];

  for (const inv of invariants) {
    const severity = inv.severity || "error";
    const handler = KIND_HANDLERS[inv.kind];

    if (!handler) {
      violations.push({
        name: inv.name,
        kind: inv.kind,
        severity: "warning",
        message: `Неизвестный kind инварианта: "${inv.kind}"`,
        details: { reason: "unknown_kind" },
      });
      continue;
    }

    const normalized = normalizeInvariant(inv);
    if (normalized == null) {
      violations.push({
        name: inv.name,
        kind: inv.kind,
        severity: "warning",
        message: `Инвариант "${inv.name || inv.kind}" в нераспознанной форме`,
        details: { reason: "unsupported_shape" },
      });
      continue;
    }

    try {
      const found = handler(normalized, world, ontology, opts) || [];
      for (const v of found) {
        violations.push({
          name: inv.name,
          kind: inv.kind,
          severity,
          message: v.message,
          details: v.details || {},
        });
      }
    } catch (e) {
      violations.push({
        name: inv.name,
        kind: inv.kind,
        severity: "warning",
        message: `Ошибка исполнения инварианта: ${e.message}`,
        details: { reason: "handler_threw", error: String(e) },
      });
    }
  }

  const hasError = violations.some(v => v.severity === "error");
  return { ok: !hasError, violations };
}

export { checkInvariants, registerKind, KIND_HANDLERS };
