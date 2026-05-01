/**
 * @intent-driven/renderer — Intent-Driven Frontend renderer.
 *
 * Primitives, archetypes, controls, adapter registry (shared).
 * См. манифест IDF v1.6 §16a, §17.
 */

// Верхний уровень
export { default as ProjectionRendererV2 } from "./ProjectionRendererV2.jsx";
export { default as SlotRenderer } from "./SlotRenderer.jsx";
export { default as ErrorBoundary } from "./ErrorBoundary.jsx";

// Архетипы (barrel из A9)
export { registerCanvas } from "./archetypes/ArchetypeCanvas.jsx";
import * as archetypes from "./archetypes/index.js";
export { archetypes };

// Controls (barrel из A8 / step 1)
import * as controls from "./controls/index.js";
export { controls };

// Примитивы
export { Chart, Sparkline } from "./primitives/chart.jsx";
export { ViewSwitcher } from "./primitives/viewSwitcher.jsx";
export { EventTimeline } from "./primitives/eventTimeline.jsx";
import * as primitives from "./primitives/index.js";
export { primitives };

// Реестр UI-адаптеров (shared surface)
export {
  registerUIAdapter,
  getUIAdapter,
  getAdaptedComponent,
  pickAdaptedComponent,
  getCapability,
  supportsVariant,
} from "./adapters/registry.js";
export {
  scoreCandidate,
  rankCandidates,
  pickBest,
  getAffinity,
  AFFINITY_WEIGHTS,
} from "./adapters/matching.js";
export {
  AdapterProvider,
  AdapterContext,
  useAdapter,
  useAdapterComponent,
  useAdapterPick,
  resolveAdapterComponent,
} from "./adapters/AdapterProvider.jsx";
export { AuthForm } from "./primitives/AuthForm.jsx";
export { Countdown } from "./primitives/Countdown.jsx";
export { UndoToast } from "./primitives/UndoToast.jsx";
export { default as AdminShell } from "./primitives/AdminShell.jsx";
export { default as BlockEditor, BlockEditorFallback, buildHierarchy } from "./primitives/BlockEditor.jsx";
// Icon primitive (D12) — canonical names + lucide-react / emoji fallback.
// Старый emoji-based Icon из adapters/Icon.jsx — IconLegacy (для backward compat).
export {
  default as Icon,
  registerIconResolver,
  EMOJI_MAP,
  LUCIDE_MAP,
} from "./primitives/Icon.jsx";
export { default as IconLegacy } from "./adapters/Icon.jsx";
import * as labels from "./adapters/labels.js";
export { labels };

// Parameters / navigation / validation
import * as parameters from "./parameters/index.jsx";
export { parameters };
export * from "./navigation/index.js";
export { validateArtifact } from "./validation/validateArtifact.js";

// Co-selection — shared selection state между peer-projections
// (см. bidirectional-canvas-tree-selection pattern, candidate/cross/).
export {
  CoSelectionProvider,
  CoSelectionContext,
  useCoSelection,
  useCoSelectionActive,
  useCoSelectionEnabled,
} from "./coSelection.jsx";

// Утилиты
export * from "./hooks.js";
export {
  resolve,
  template,
  evalCondition,
  evalIntentCondition,
  computeWitness,
  resolveParams,
} from "./eval.js";
