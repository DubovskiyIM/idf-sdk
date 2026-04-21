/**
 * @intent-driven/engine — Φ-lifecycle для Intent-Driven Frontend.
 *
 * Experimental API (0.1.x). См. README и design-spec
 * docs/superpowers/specs/2026-04-21-intent-driven-engine-design.md
 */

export const VERSION = "0.1.0";

// Orchestrator
export { createEngine } from "./engine.js";

// Building blocks (для advanced wiring)
export { createValidator } from "./validator.js";
export { createRuleEngine } from "./ruleEngine.js";
export { createTimeEngine, TimerQueue, hydrateFromWorld, evalGuard } from "./timeEngine.js";

// Persistence
export { createInMemoryPersistence } from "./persistence/inMemory.js";

// Rule helpers (чистые функции, без DI)
export {
  matchTrigger,
  resolveContext,
  buildActionEffect,
  evaluateCondition,
  evaluateRuleCondition,
  parseSchedule,
  shouldFireSchedule,
  cronToFirstFiresAt,
} from "./ruleEngine.js";

// Schedule v2 expressions
export { parseDuration, readPath, resolveFiresAt } from "./scheduleV2.js";
