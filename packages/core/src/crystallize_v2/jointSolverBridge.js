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
import { normalizeIntentsMap } from "./normalizeIntentNative.js";
import { appliesToProjection } from "./assignToSlotsShared.js";

// ============================================================================
// Empirical default slot models (Phase 3c').
//
// Источник: idf/scripts/jointsolver-empirical-slots.mjs прогон на 16 доменах
// (booking/planning/workflow/messenger/sales/lifequest/reflect/invest/delivery/
//  freelance/compliance/keycloak/argocd/notion/automation/gravitino).
//
// Дата измерений: 2026-04-27.
//
// Структура:
//   capacity     = p95 наблюдаемых intent counts (empirical, conservative)
//   allowedRoles = inclusive defaults — все salience-tier roles + destructive
//                  где observed. Empirical observed roles = lower bound
//                  (99% intents в real domains не имеют explicit
//                  intent.salience → default 40 = navigation tier);
//                  inclusive set accommodates explicit-salience annotations.
//
// Сравнение с Phase 2b упрощённой моделью:
//   - overlay slot добавлен во все archetypes (закрывал 268/470 = 57%
//     divergences из Phase 3a — top divergence pattern был overlay → toolbar)
//   - context, fab, secondary — declared в Phase 2b, в practice unused
//     (0 observations) → удалены
//   - capacities recalibrated: detail/primaryCTA 3 → 10, detail/footer
//     3 → 35 (heavy footers в keycloak/argocd/gravitino), detail/toolbar
//     10 → 3
// ============================================================================

// Slot declaration order служит stable tie-break через Object.keys
// в Hungarian solver. Order semantic: primary-candidate slots first,
// чтобы explicit primary intents (salience ≥ 80) предпочитали
// hero/primaryCTA, secondary — toolbar, overflow — overlay/footer.
//
// Phase 4: tier `unspecified` (intents без explicit intent.salience —
// 99% реальных intents) идут только в overflow slots (toolbar/overlay/footer),
// чтобы не претендовать на primary placement (hero/primaryCTA) без явного
// signal от автора. Закрывает ~474 из 476 divergent cases (Phase 4 research):
// 309 catalog `overlay → toolbar/hero` + 165 detail `toolbar/overlay → primaryCTA`
// — все unannotated intents auto-routed в primary slots до Phase 4.

const ALL_TIER_ROLES = ["primary", "secondary", "navigation", "utility"];
const OVERFLOW_ROLES = ["primary", "secondary", "navigation", "utility", "unspecified"];

const SLOTS_CATALOG = {
  hero:    { capacity:  2, allowedRoles: ALL_TIER_ROLES },
  toolbar: { capacity:  5, allowedRoles: OVERFLOW_ROLES },
  overlay: { capacity:  9, allowedRoles: [...OVERFLOW_ROLES, "destructive"] },
};

const SLOTS_DETAIL = {
  primaryCTA: { capacity: 10, allowedRoles: [...ALL_TIER_ROLES, "destructive"] },
  toolbar:    { capacity:  3, allowedRoles: OVERFLOW_ROLES },
  overlay:    { capacity:  9, allowedRoles: [...OVERFLOW_ROLES, "destructive"] },
  footer:     { capacity: 35, allowedRoles: [...OVERFLOW_ROLES, "destructive"] },
};

const SLOTS_FEED = {
  toolbar: { capacity:  5, allowedRoles: OVERFLOW_ROLES },
  overlay: { capacity: 14, allowedRoles: [...OVERFLOW_ROLES, "destructive"] },
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

  // Normalize INTENTS до accessibleIntents — object-format intents (notion,
  // gravitino, automation) имеют top-level α/target вместо particles.effects.
  // accessibleIntents читает particles, поэтому без normalize эти intents
  // не находятся. crystallize_v2 нормализует на входе; bridge — caller-direct
  // вход — должен делать то же. Idempotent — уже-normalized passes через no-op.
  const normalizedIntents = normalizeIntentsMap(INTENTS);

  // Phase 3g: appliesToProjection symmetry с derived assignToSlots*.
  //
  // accessibleIntents wider than appliesToProjection — он только проверяет
  // intentTouchesEntity + roleDef.canExecute. Derived assignToSlots*
  // дополнительно фильтрует через appliesToProjection (creator-scoping,
  // route-scope, effect-less utility check, search witness check). Без
  // matching этих rules bridge становится too-inclusive — alternate-only
  // residue 530 cases (Phase 3g research показал bridge видит intents
  // которые derived НАМЕРЕННО не показывает).
  //
  // Apply applies (после accessibleIntents) для symmetric comparison.
  const filteredByAccess = accessibleIntents(projection, role, normalizedIntents, ONTOLOGY);
  const rawIntents = filteredByAccess.filter((intent) => appliesToProjection(intent, projection));
  const mainEntity = projection?.mainEntity;

  // Enrich intents с computed salience (если ещё нет explicit).
  // Phase 4: помечаем _salienceSource — "explicit" (author declared) vs
  // "computed" (heuristic из particles). classifyIntentRole использует
  // это чтобы отличить author-trusted primary signal от system-derived
  // (overflow placement default).
  const enriched = rawIntents.map((intent) => {
    if (typeof intent.salience === "number") {
      return { ...intent, _salienceSource: "explicit" };
    }
    const computed = computeSalience(intent, mainEntity);
    return { ...intent, salience: computed.value, _salienceSource: computed.source };
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
