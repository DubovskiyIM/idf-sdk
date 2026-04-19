/**
 * Нормализация альтернативных форм declare-инвариантов.
 *
 * Разные домены описывают инварианты в разной "ухвате":
 *  - canon referential: {from:"E.f", to:"E.f"}
 *  - alt:               {entity, field, references:"E.f"}
 *  - canon aggregate:   {op, from:"E.f", target:"E.f", where}
 *  - alt:               {entity, field, formula:{op, of:"E.f", where}}
 *  - canon transition:  {transitions | order}
 *  - alt:               {allowed:[...]}  # whitelist значений (без order)
 *
 * Возврат: нормализованный invariant (новый объект), либо null, если форма
 * не распознаётся. Исходный объект не мутируется.
 */

function normalizeReferential(inv) {
  if (inv.from && inv.to) return inv;
  if (inv.entity && inv.field && typeof inv.references === "string") {
    return {
      ...inv,
      from: `${inv.entity}.${inv.field}`,
      to: inv.references,
    };
  }
  return null;
}

function normalizeAggregate(inv) {
  if (inv.op && inv.from && inv.target) return inv;
  if (inv.entity && inv.field && inv.formula && inv.formula.op && inv.formula.of) {
    return {
      ...inv,
      op: inv.formula.op,
      from: inv.formula.of,
      target: `${inv.entity}.${inv.field}`,
      where: inv.formula.where || inv.where,
    };
  }
  return null;
}

function normalizeTransition(inv) {
  if (Array.isArray(inv.transitions) || Array.isArray(inv.order)) return inv;
  if (Array.isArray(inv.allowed)) return inv;
  return null;
}

const NORMALIZERS = {
  referential: normalizeReferential,
  aggregate:   normalizeAggregate,
  transition:  normalizeTransition,
};

function normalizeInvariant(inv) {
  const fn = NORMALIZERS[inv.kind];
  if (!fn) return inv;
  const normalized = fn(inv);
  return normalized;
}

export { normalizeInvariant, NORMALIZERS };
