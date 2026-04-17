/**
 * Apply matched structural patterns to slots + honor author preferences.
 * Part of crystallize step (3). Pure function.
 *
 * @param {object} slots — current slots from assignToSlots
 * @param {Array} matched — [{ pattern, explain }] from matchPatterns
 * @param {object} context — { ontology, mainEntity, intents, projection }
 * @param {object} preferences — { enabled?: string[], disabled?: string[] }
 * @param {object} registry — pattern registry for enabled lookup
 * @returns {object} mutated slots
 */
export function applyStructuralPatterns(slots, matched, context, preferences = {}, registry) {
  const enabled = new Set(preferences.enabled || []);
  const disabled = new Set(preferences.disabled || []);
  const applied = new Set();
  let next = slots;
  for (const { pattern } of matched) {
    if (disabled.has(pattern.id)) continue;
    if (typeof pattern.structure?.apply !== "function") continue;
    next = pattern.structure.apply(next, context);
    applied.add(pattern.id);
  }
  for (const patternId of enabled) {
    if (applied.has(patternId)) continue;
    const pattern = registry?.getPattern?.(patternId);
    if (!pattern || typeof pattern.structure?.apply !== "function") continue;
    next = pattern.structure.apply(next, context);
    applied.add(patternId);
  }
  return next;
}
