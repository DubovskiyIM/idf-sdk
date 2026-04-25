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
import rowContextualActionsMenu from "./catalog/row-contextual-actions-menu.js";
import reputationLevelBadge from "./detail/reputation-level-badge.js";
import directInviteSidebar from "./detail/direct-invite-sidebar.js";
// Tri-source field research (2026-04-25): два workflow-editor field-test'а
// (LLM/AI-agent + Spark/data-pipeline) + Angular-imperative legacy с polymorphic
// 200+ кубами и 18-fork brand-overlay. Все три независимо пришли к этим
// четырём паттернам; формализуем как candidate.
import humanInTheLoopGate from "./cross/human-in-the-loop-gate.js";
import compositionAsCallable from "./cross/composition-as-callable.js";
import agentPlanPreviewApprove from "./cross/agent-plan-preview-approve.js";
import lifecycleGatesOnRun from "./detail/lifecycle-gates-on-run.js";

// Promoted в stable (2026-04-20, B2):
//   rating-aggregate-hero       → stable/detail/
//   review-criterion-breakdown  → stable/detail/
//   response-cost-before-action → stable/feed/
// Promoted в stable (2026-04-23, Gravitino dogfood):
//   catalog-default-datagrid    → stable/catalog/ (with structure.apply)
// Promoted в stable (2026-04-24, workflow-editor field-test dogfood):
//   bidirectional-canvas-tree-selection → stable/cross/ (with structure.apply)
//   После закрытия трёх gate'ов: trigger.kind co-selection-group-entity (#303),
//   CoSelectionProvider primitive (#308), adapter externalSelection capability (#311).

export {
  categoryTreeWithCounter,
  paidPromotionSlot,
  mapFilterCatalog,
  rowContextualActionsMenu,
  reputationLevelBadge,
  directInviteSidebar,
  humanInTheLoopGate,
  compositionAsCallable,
  agentPlanPreviewApprove,
  lifecycleGatesOnRun,
};

export const CURATED_CANDIDATES = [
  categoryTreeWithCounter,
  paidPromotionSlot,
  mapFilterCatalog,
  rowContextualActionsMenu,
  reputationLevelBadge,
  directInviteSidebar,
  humanInTheLoopGate,
  compositionAsCallable,
  agentPlanPreviewApprove,
  lifecycleGatesOnRun,
];
