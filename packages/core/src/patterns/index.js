/**
 * UX Pattern Layer — public API.
 *
 * resolvePattern(intents, ontology, projection) → { pattern, score, confidence, strategy }
 */

export { classifyPattern } from "./classifier.js";
export { buildStrategy, DEFAULT_STRATEGY } from "./strategy.js";
export { BUILT_IN_PATTERNS } from "./bank.js";

import { classifyPattern } from "./classifier.js";
import { buildStrategy } from "./strategy.js";

/**
 * Вывести паттерн и построить strategy для проекции.
 *
 * @param {Array} intents — intent-объекты проекции [{id, particles}]
 * @param {object} ontology
 * @param {object} projection
 * @returns {{ pattern: string|null, score: number, confidence: string, strategy: object }}
 */
export function resolvePattern(intents, ontology, projection) {
  const result = classifyPattern(intents, ontology, projection);
  const strategy = buildStrategy(result, ontology);
  return { ...result, strategy };
}
