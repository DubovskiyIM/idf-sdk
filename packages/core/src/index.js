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

// Snapshot — incremental fold (A1: closed-over префикс Φ)
export {
  createSnapshot,
  foldFromSnapshot,
  applyEffect,
  getCollectionType,
} from "./snapshot.js";

// Joint solver — Phase 1 (pure-функции; интеграция в assignToSlots* — Phase 2)
export {
  classifyIntentRole,
  buildCostMatrix,
  greedyAssign,
  INFINITY_COST,
} from "./crystallize_v2/jointSolver.js";

// Joint solver — Phase 2a: Hungarian (optimal assignment, drop-in для greedy)
export {
  hungarianAssign,
  hungarianMatch,
  expandSlots,
} from "./crystallize_v2/hungarianAssign.js";

// Joint solver — Phase 2b: bridge (same signature как assignToSlots*, diagnostic)
export {
  computeAlternateAssignment,
  getDefaultSlotsForArchetype,
} from "./crystallize_v2/jointSolverBridge.js";

// Joint solver — Phase 2c: diagnostic helper (derived vs alternate diff)
export {
  extractDerivedAssignment,
  diagnoseAssignment,
} from "./crystallize_v2/jointSolverDiagnose.js";

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
export { extractSalienceFeatures, FEATURE_KEYS } from "./crystallize_v2/salienceFeatures.js";
export { salienceFromFeatures, DEFAULT_SALIENCE_WEIGHTS } from "./crystallize_v2/salience.js";
export { composeProjections } from "./crystallize_v2/composeProjections.js";
export { explainCrystallize, explainAllCrystallize } from "./crystallize_v2/explainCrystallize.js";
export { resolveCompositions, resolveItemCompositions, getAliasedField } from "./crystallize_v2/resolveCompositions.js";
export { collectNearMissWitnesses, groupNearMissByRule } from "./crystallize_v2/nearMissWitnesses.js";
export { validateArtifact } from "./crystallize_v2/validateArtifact.js";
export { inferFieldRole } from "./crystallize_v2/ontologyHelpers.js";
export {
  generateEditProjections,
  generateCreateProjections,
  findReplaceIntents,
  buildFormSpec,
  buildCreateFormSpec,
} from "./crystallize_v2/formGrouping.js";
// backlog §9.1 / §9.7: expose для host'ов — нужно мапить нативные типы
// при построении собственного formSpec (minimal useReducer-форма).
export { mapOntologyTypeToControl } from "./crystallize_v2/ontologyHelpers.js";
// backlog §8.1: normalize для host'ов, кто хочет применить bridge вне
// crystallizeV2 (например, debug-inspect или custom pipeline).
export { normalizeIntentNative, normalizeIntentsMap } from "./crystallize_v2/normalizeIntentNative.js";
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
export {
  resolveInheritedPermission,
  isInheritablePermission,
  isPermissionSufficient,
} from "./permissionInheritance.js";

// §12.1 — projection.archetype → projection.kind unification
export { normalizeProjection, normalizeProjections } from "./normalizeProjection.js";

// §12.2 — primary-display field discovery (voice/document materializer'ы)
export { getPrimaryFieldName, getPrimaryFieldValue } from "./getPrimaryFieldName.js";
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

// Audit log — производная материализация над Φ для observer-role
// (compliance/SOX ICFR, 13-й полевой тест)
export {
  materializeAuditLog,
  buildAuditContext,
} from "./materializers/auditLog.js";

// Global invariants (§14 v1.6.1) — schema-level ∀-свойства world
export {
  checkInvariants,
  registerKind,
  KIND_HANDLERS,
} from "./invariants/index.js";

// Asset-boundary helpers (§19 v1.7) — декларация внешних asset-источников
export { getAssets, validateAsset, ASSET_KINDS } from "./ontology/assets.js";

// Polymorphic entity-kind (P0.2 — §14 ext, 2026-04-26) — entity с
// discriminator + variants (закрывает gap «node-type explosion» 70+/200+).
export {
  isPolymorphicEntity,
  getDiscriminatorField,
  getEntityVariants,
  getEntityVariant,
  listVariantValues,
  getEffectiveFields,
  getUnionFields,
  getVariantSpecificFields,
  validatePolymorphicEntity,
} from "./ontology/polymorphic.js";

// Polymorphic foreign-key fields (§12.9, 2026-04-27, Notion field-test) —
// sparse-FK XOR-pair (Comment.pageId XOR blockId) declarative shape вместо
// ручных expression invariants.
export {
  isPolymorphicFkField,
  getPolymorphicFkFields,
  getActiveAlternative,
  validatePolymorphicFkRow,
  buildPolymorphicFkInvariants,
  resolvePolymorphicFkParent,
} from "./ontology/polymorphicFk.js";

// Canonical type-map + auto field-mapping (P0.4 — backlog §9.1, 2026-04-26).
// Закрывает gap «type:string не мапится» из importer'ов и 70+ ручных
// camelCase ↔ snake_case трансформ при FE↔BE bridge.
export {
  CANONICAL_TYPES,
  TYPE_ALIASES,
  normalizeFieldType,
  normalizeFieldDef,
  camelToSnake,
  snakeToCamel,
  inferWireFieldName,
  applyFieldMapping,
  buildAutoFieldMapping,
} from "./ontology/typeMapping.js";

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

// Role-aware projection filtering (backlog §4.9) — projection.forRoles
// декларирует в каких активных ролях видим в ROOT-навигации.
export {
  filterProjectionsByRole,
  isProjectionAvailableForRole,
  partitionProjectionsByRole,
} from "./filterProjectionsByRole.js";

// Information Bottleneck filter (Phase 1 salience formalization)
export {
  accessibleIntents,
  intentTouchesEntity,
} from "./crystallize_v2/accessibleIntents.js";
