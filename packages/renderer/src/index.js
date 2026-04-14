/**
 * @idf/renderer — Intent-Driven Frontend renderer.
 *
 * Primitives, archetypes, controls, adapter registry (shared).
 * См. манифест IDF v1.6 §16a, §17.
 */

// Верхний уровень
export { default as ProjectionRendererV2 } from "./ProjectionRendererV2.jsx";
export { default as SlotRenderer } from "./SlotRenderer.jsx";
export { default as ErrorBoundary } from "./ErrorBoundary.jsx";

// Архетипы (barrel из A9)
import * as archetypes from "./archetypes/index.js";
export { archetypes };

// Controls (barrel из A8 / step 1)
import * as controls from "./controls/index.js";
export { controls };

// Примитивы
export { Chart, Sparkline } from "./primitives/chart.jsx";
import * as primitives from "./primitives/index.js";
export { primitives };

// Реестр UI-адаптеров (shared surface)
export {
  registerUIAdapter,
  getUIAdapter,
  getAdaptedComponent,
  getCapability,
  supportsVariant,
} from "./adapters/registry.js";
export { default as Icon } from "./adapters/Icon.jsx";
import * as labels from "./adapters/labels.js";
export { labels };

// Parameters / navigation / validation
import * as parameters from "./parameters/index.jsx";
export { parameters };
export * from "./navigation/index.js";
export { validateArtifact } from "./validation/validateArtifact.js";

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
