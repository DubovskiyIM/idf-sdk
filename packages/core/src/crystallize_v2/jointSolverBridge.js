/**
 * Joint solver bridge — Phase 2b.
 *
 * Same signature как existing assignToSlots* (INTENTS, projection,
 * ONTOLOGY, opts?). Извлекает intents через accessibleIntents, enrich
 * computed salience, default slots по archetype, прогоняет
 * hungarianAssign (или greedyAssign через opts.solver).
 *
 * Diagnostic side-by-side для будущей Phase 2c integration —
 * assignToSlots* могут эмитить witness 'joint-solver-alternative' для
 * визуального сравнения в Studio.
 *
 * Backlog: docs/superpowers/specs/2026-04-26-core-backlog.md § A2.
 * Plan: docs/superpowers/plans/2026-04-27-joint-solver-phase2b-bridge.md
 */

import { accessibleIntents } from "./accessibleIntents.js";
import { computeSalience } from "./salience.js";
import { buildCostMatrix, greedyAssign } from "./jointSolver.js";
import { hungarianAssign } from "./hungarianAssign.js";

const SLOTS_CATALOG = {
  hero:    { capacity: 1,  allowedRoles: ["primary"] },
  toolbar: { capacity: 5,  allowedRoles: ["primary", "secondary", "navigation"] },
  context: { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  fab:     { capacity: 1,  allowedRoles: ["destructive"] },
};

const SLOTS_DETAIL = {
  primaryCTA: { capacity: 3,  allowedRoles: ["primary", "destructive"] },
  secondary:  { capacity: 5,  allowedRoles: ["secondary", "navigation"] },
  toolbar:    { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  footer:     { capacity: 3,  allowedRoles: ["utility", "destructive"] },
};

const SLOTS_FEED = {
  toolbar: { capacity: 5,  allowedRoles: ["primary", "secondary", "navigation"] },
  context: { capacity: 10, allowedRoles: ["secondary", "utility", "navigation"] },
  fab:     { capacity: 1,  allowedRoles: ["destructive"] },
};

/**
 * Default slot model для archetype'а.
 *
 * Phase 2b/c starting point. Phase 2d может извлекать из archetype-rules
 * или projection.slots overrides.
 *
 * @param {string} archetype
 * @returns {Record<string, { capacity: number, allowedRoles: string[] }>}
 */
export function getDefaultSlotsForArchetype(archetype) {
  switch (archetype) {
    case "detail": return SLOTS_DETAIL;
    case "feed": return SLOTS_FEED;
    case "catalog":
    default: return SLOTS_CATALOG;
  }
}

/**
 * Bridge: extracts intents через accessibleIntents → hungarianAssign.
 *
 * Same signature как assignToSlots*. Returns same shape как
 * hungarian/greedyAssign плюс metadata.
 *
 * @param {Record<string, Object>} INTENTS — INTENTS object из ontology
 * @param {Object} projection — { id, mainEntity, archetype, kind?, forRoles? }
 * @param {Object} ONTOLOGY — { entities, roles }
 * @param {{
 *   role?: string,
 *   slots?: Record<string, { capacity: number, allowedRoles: string[] }>,
 *   solver?: "hungarian" | "greedy",
 * }} [opts]
 * @returns {{
 *   assignment: Map<string, string>,
 *   unassigned: string[],
 *   witnesses: Array<Object>,
 *   metadata: {
 *     basis: "joint-solver-alternative",
 *     reliability: "rule-based",
 *     archetype: string,
 *     role: string,
 *     mainEntity: string|undefined,
 *     solver: string,
 *     intentCount: number,
 *     slotNames: string[],
 *   },
 * }}
 */
export function computeAlternateAssignment(INTENTS, projection, ONTOLOGY, opts = {}) {
  const role = opts.role
    ?? (Array.isArray(projection?.forRoles) ? projection.forRoles[0] : null)
    ?? "observer";

  const archetype = projection?.archetype || projection?.kind || "catalog";
  const slots = opts.slots || getDefaultSlotsForArchetype(archetype);

  const rawIntents = accessibleIntents(projection, role, INTENTS, ONTOLOGY);
  const mainEntity = projection?.mainEntity;

  // Enrich intents с computed salience (если ещё нет explicit)
  const enriched = rawIntents.map((intent) => {
    if (typeof intent.salience === "number") return intent;
    const computed = computeSalience(intent, mainEntity);
    return { ...intent, salience: computed.value };
  });

  const matrix = buildCostMatrix({ intents: enriched, slots, mainEntity });

  const solverName = opts.solver === "greedy" ? "greedy" : "hungarian";
  const solverFn = solverName === "greedy" ? greedyAssign : hungarianAssign;
  const result = solverFn(matrix, slots);

  return {
    ...result,
    metadata: {
      basis: "joint-solver-alternative",
      reliability: "rule-based",
      archetype,
      role,
      mainEntity,
      solver: solverName,
      intentCount: enriched.length,
      slotNames: Object.keys(slots),
    },
  };
}
