/**
 * Joint solver diagnostic helper — Phase 2c.
 *
 * Standalone diff между derived assignment (existing assignToSlots*)
 * и alternate assignment (computeAlternateAssignment через jointSolver).
 * Не модифицирует assignToSlots* — caller (host или crystallizeV2)
 * сам решает звать diagnoseAssignment когда хочет emission witness.
 *
 * Phase 2d (intrusive integration внутри assignToSlots*) — отдельный
 * backlog item.
 *
 * Backlog: docs/superpowers/specs/2026-04-26-core-backlog.md § A2.
 * Plan: docs/superpowers/plans/2026-04-27-joint-solver-phase2c-diagnostic.md
 */

import { computeAlternateAssignment } from "./jointSolverBridge.js";

/**
 * Извлечь Map<intentId, slotName> из slots-структуры existing
 * assignToSlots*.
 *
 * Slots — `Record<slotName, Array<node>>`. Node с `node.intentId`
 * считается intent-bearing. Остальные nodes (текстовые блоки, derived
 * body, gating panels, sidebar cards) пропускаются.
 *
 * @param {Record<string, Array<{ intentId?: string }>>} slots
 * @returns {Map<string, string>}
 */
export function extractDerivedAssignment(slots) {
  const map = new Map();
  if (!slots || typeof slots !== "object") return map;
  for (const [slotName, nodes] of Object.entries(slots)) {
    if (!Array.isArray(nodes)) continue;
    for (const n of nodes) {
      if (n && typeof n === "object" && typeof n.intentId === "string") {
        // Первое появление wins — это соответствует semantic, что один
        // intent один раз в одном slot'е.
        if (!map.has(n.intentId)) map.set(n.intentId, slotName);
      }
    }
  }
  return map;
}

/**
 * Сравнить derived (существующий) и alternate (jointSolver) assignment'ы.
 * Возвращает witness `joint-solver-alternative` с diff'ом — для
 * Studio side-by-side review.
 *
 * Diff items:
 * - `divergent`: intent в обоих, но в разных slot'ах
 *   { intentId, derived: slotA, alternate: slotB }
 * - `derived-only`: intent в derived, не в alternate (jointSolver счёл
 *   ill-conditioned или filter отбросил)
 *   { intentId, derived: slotA, alternate: null }
 * - `alternate-only`: intent в alternate, не в derived (existing logic
 *   пропустил)
 *   { intentId, derived: null, alternate: slotB }
 *
 * Если diff пуст (полное соответствие) — witness'а нет, returns null.
 *
 * @param {Object} opts
 * @param {Record<string, Object>} opts.INTENTS
 * @param {Object} opts.projection
 * @param {Object} opts.ONTOLOGY
 * @param {Record<string, Array<Object>>} opts.derivedSlots — output
 *   assignToSlotsCatalog/Detail
 * @param {string} [opts.role]
 * @param {Record<string, { capacity: number, allowedRoles: string[] }>} [opts.slots]
 *   — alternate slot model override (default — getDefaultSlotsForArchetype)
 * @param {"hungarian" | "greedy"} [opts.solver]
 * @returns {{
 *   basis: "joint-solver-alternative",
 *   reliability: "rule-based",
 *   archetype: string,
 *   role: string,
 *   solver: string,
 *   diff: Array<{
 *     intentId: string,
 *     derived: string | null,
 *     alternate: string | null,
 *     kind: "divergent" | "derived-only" | "alternate-only",
 *   }>,
 *   summary: { total: number, divergent: number, derivedOnly: number, alternateOnly: number, agreed: number },
 * } | null}
 */
export function diagnoseAssignment({
  INTENTS,
  projection,
  ONTOLOGY,
  derivedSlots,
  role,
  slots,
  solver,
}) {
  const derived = extractDerivedAssignment(derivedSlots);
  const altResult = computeAlternateAssignment(INTENTS, projection, ONTOLOGY, {
    role,
    slots,
    solver,
  });
  const alternate = altResult.assignment;

  const allIntentIds = new Set([...derived.keys(), ...alternate.keys()]);
  const diff = [];
  let agreed = 0;

  for (const intentId of allIntentIds) {
    const dSlot = derived.get(intentId) ?? null;
    const aSlot = alternate.get(intentId) ?? null;

    if (dSlot && aSlot) {
      if (dSlot === aSlot) {
        agreed++;
      } else {
        diff.push({ intentId, derived: dSlot, alternate: aSlot, kind: "divergent" });
      }
    } else if (dSlot && !aSlot) {
      diff.push({ intentId, derived: dSlot, alternate: null, kind: "derived-only" });
    } else if (!dSlot && aSlot) {
      diff.push({ intentId, derived: null, alternate: aSlot, kind: "alternate-only" });
    }
  }

  if (diff.length === 0) return null;

  const counts = {
    total: allIntentIds.size,
    divergent: diff.filter((d) => d.kind === "divergent").length,
    derivedOnly: diff.filter((d) => d.kind === "derived-only").length,
    alternateOnly: diff.filter((d) => d.kind === "alternate-only").length,
    agreed,
  };

  return {
    basis: "joint-solver-alternative",
    reliability: "rule-based",
    archetype: altResult.metadata.archetype,
    role: altResult.metadata.role,
    solver: altResult.metadata.solver,
    diff,
    summary: counts,
  };
}
