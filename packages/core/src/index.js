/**
 * @idf/core — Intent-Driven Frontend ядро.
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

// Condition parser
export { parseCondition, parseConditions } from "./conditionParser.js";

// Crystallize v2
export { crystallizeV2 } from "./crystallize_v2/index.js";
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
