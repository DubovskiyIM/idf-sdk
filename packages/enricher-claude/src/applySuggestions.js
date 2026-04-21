/**
 * Merge'ит Claude-suggestions в ontology. Pure function — возвращает новый объект,
 * input не мутируется.
 *
 * @param {object} ontology
 * @param {object} suggestions — { namedIntents, absorbHints, additionalRoles, baseRoles }
 * @param {{ only?: string[] }} opts — фильтр на категории
 */
export function applySuggestions(ontology, suggestions, opts = {}) {
  const only = opts.only ? new Set(opts.only) : null;
  const allowed = (category) => !only || only.has(category);

  const next = structuredClone(ontology);

  if (allowed("namedIntents")) {
    for (const s of suggestions.namedIntents ?? []) {
      if (next.intents[s.name]) continue; // не перезаписываем existing
      next.intents[s.name] = {
        target: s.target,
        ...(s.alpha ? { alpha: s.alpha } : {}),
        parameters: { id: { type: "string", required: true } },
        __witness: `@enricher: ${s.reason}`,
      };
    }
  }

  if (allowed("additionalRoles")) {
    for (const s of suggestions.additionalRoles ?? []) {
      const entity = next.entities[s.entity];
      if (!entity) continue;
      const field = entity.fields[s.field];
      if (!field) continue;
      field.role = s.role;
    }
  }

  if (allowed("baseRoles")) {
    for (const s of suggestions.baseRoles ?? []) {
      if (!next.roles[s.role]) {
        next.roles[s.role] = { base: s.role };
      }
    }
  }

  if (allowed("absorbHints")) {
    for (const s of suggestions.absorbHints ?? []) {
      const child = next.entities[s.child];
      if (!child) continue;
      child.absorbedBy = `${s.parent}_detail`;
    }
  }

  return next;
}
