/**
 * @intent-driven/core — Intent-Driven Frontend ядро.
 *
 * Engine, fold, intent algebra, crystallize_v2.
 *
 * См. манифест IDF v1.5 в основном репозитории.
 */

// Engine — главный hook + helpers
export { useEngine } from "./engine.js";

// Fold — мир из эффектов
export {
  fold,
  foldDrafts,
  applyPresentation,
  buildTypeMap,
  filterByStatus,
} from "./fold.js";
export { causalSort } from "./causalSort.js";

// Intent algebra — связи ▷ ⇌ ⊕ ∥
export {
  computeAlgebra,
  computeAlgebraWithEvidence,
  normalizeEntityFromTarget,
} from "./intentAlgebra.js";

// Composition algebra
export { checkComposition } from "./algebra.js";

// Integrity rules
export { checkIntegrity } from "./integrity.js";

// Anchoring (§15 zazor #1 — v1.8)
export { checkAnchoring } from "./anchoring.js";
export { AnchoringError } from "./errors.js";

// Condition parser
export { parseCondition, parseConditions } from "./conditionParser.js";

// Crystallize v2
export { crystallizeV2 } from "./crystallize_v2/index.js";
export { deriveProjections } from "./crystallize_v2/deriveProjections.js";
export { composeProjections } from "./crystallize_v2/composeProjections.js";
export { explainCrystallize, explainAllCrystallize } from "./crystallize_v2/explainCrystallize.js";
export { resolveCompositions, resolveItemCompositions, getAliasedField } from "./crystallize_v2/resolveCompositions.js";
export { collectNearMissWitnesses, groupNearMissByRule } from "./crystallize_v2/nearMissWitnesses.js";
export { validateArtifact } from "./crystallize_v2/validateArtifact.js";
export { inferFieldRole } from "./crystallize_v2/ontologyHelpers.js";
export {
  generateEditProjections,
  findReplaceIntents,
  buildFormSpec,
} from "./crystallize_v2/formGrouping.js";
export {
  registerArchetype,
  prependArchetype,
  selectArchetype,
  getArchetypes,
} from "./crystallize_v2/controlArchetypes.js";

// Constants
export {
  PARTICLE_COLORS,
  ALPHA_LABELS,
  LINK_COLORS,
  SLOT_STATUS_COLORS,
  BOOKING_STATUS_COLORS,
} from "./constants.js";

// ────────────────────────────────────────────────────────────
// v0.2.0 — server schema (pure functions для agent layer + materializations)
// ────────────────────────────────────────────────────────────

// Filter world per role + many-to-many через role.scope (§5)
export { filterWorldForRole } from "./filterWorld.js";
export { evalFilter } from "./filterExpr.js";

// Базовые роли (§5 v1.6.1) — таксономия owner / viewer / agent / observer
export {
  BASE_ROLES,
  validateBase,
  getRolesByBase,
  isAgentRole,
  isObserverRole,
  isOwnerRole,
  auditOntologyRoles,
} from "./baseRoles.js";

// Preapproval guard (§17 v1.6) — agent лимиты поверх JWT
export { checkPreapproval } from "./preapprovalGuard.js";

// Materializers (§1 четыре материализации)
export {
  materializeAsDocument,
  renderDocumentHtml,
} from "./materializers/documentMaterializer.js";
export {
  materializeAsVoice,
  renderVoiceSsml,
  renderVoicePlain,
} from "./materializers/voiceMaterializer.js";

// Global invariants (§14 v1.6.1) — schema-level ∀-свойства world
export {
  checkInvariants,
  registerKind,
  KIND_HANDLERS,
} from "./invariants/index.js";

// Asset-boundary helpers (§19 v1.7) — декларация внешних asset-источников
export { getAssets, validateAsset, ASSET_KINDS } from "./ontology/assets.js";

// UX Pattern Layer — поведенческие паттерны поверх архетипов
export {
  resolvePattern,
  BUILT_IN_PATTERNS,
  DEFAULT_STRATEGY,
} from "./patterns/index.js";

// Pattern Bank — формальный банк правил деривации
export {
  createRegistry,
  getDefaultRegistry,
  loadStablePatterns,
} from "./patterns/registry.js";
export {
  validatePattern,
  evaluateTrigger,
  evaluateTriggerExplained,
} from "./patterns/schema.js";
export { explainMatch } from "./patterns/index.js";
export { computeSlotAttribution } from "./patterns/index.js";

// Candidate bank («свалка» — 127 unvalidated extractions из реальных продуктов)
export {
  CANDIDATE_PATTERNS,
  getCandidatePatterns,
  getCandidatesByArchetype,
  getCandidate,
  groupCandidatesByTheme,
  loadCandidatePatterns,
} from "./patterns/candidate/index.js";
