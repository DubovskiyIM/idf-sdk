/**
 * Curated candidate bank — structured JS-модули (profi+avito field research
 * 2026-04-17-18), прошедшие human review, строгий validatePattern (включая
 * falsification.shouldMatch/shouldNotMatch). В отличие от manifest.js
 * («свалка» 127+ кандидатов из researcher-pipeline), curated — minimal
 * promotion-ready набор.
 *
 * Формат совместим со stable (id, version, status, archetype, trigger,
 * structure, rationale, falsification), но без structure.apply.
 */
import categoryTreeWithCounter from "./catalog/category-tree-with-counter.js";
import paidPromotionSlot from "./catalog/paid-promotion-slot.js";
import mapFilterCatalog from "./catalog/map-filter-catalog.js";
import reputationLevelBadge from "./detail/reputation-level-badge.js";
import reviewCriterionBreakdown from "./detail/review-criterion-breakdown.js";
import directInviteSidebar from "./detail/direct-invite-sidebar.js";
import responseCostBeforeAction from "./feed/response-cost-before-action.js";

// rating-aggregate-hero promoted в stable (2026-04-20, B2) — см.
// packages/core/src/patterns/stable/detail/rating-aggregate-hero.js.

export {
  categoryTreeWithCounter,
  paidPromotionSlot,
  mapFilterCatalog,
  reputationLevelBadge,
  reviewCriterionBreakdown,
  directInviteSidebar,
  responseCostBeforeAction,
};

export const CURATED_CANDIDATES = [
  categoryTreeWithCounter,
  paidPromotionSlot,
  mapFilterCatalog,
  reputationLevelBadge,
  reviewCriterionBreakdown,
  directInviteSidebar,
  responseCostBeforeAction,
];
