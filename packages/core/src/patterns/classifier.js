/**
 * UX Pattern Classifier — scoring паттернов по signal-функциям.
 *
 * classifyPattern(intents, ontology, projection) → { pattern, score, confidence }
 */

import { BUILT_IN_PATTERNS } from "./bank.js";
import {
  intentActionShape,
  fieldRoleCluster,
  entityTopology,
  intentPairSymmetry,
  effectDensity,
} from "./signals.js";

const SIGNAL_FUNCTIONS = {
  intentActionShape,
  fieldRoleCluster,
  entityTopology,
  intentPairSymmetry,
  effectDensity,
};

/**
 * Классифицировать UX-паттерн для группы намерений проекции.
 *
 * @param {Array} intents — массив {id, particles} объектов
 * @param {object} ontology — онтология домена
 * @param {object} projection — определение проекции
 * @returns {{ pattern: string|null, score: number, confidence: "high"|"medium"|"ambiguous" }}
 */
export function classifyPattern(intents, ontology, projection) {
  // Override: явный паттерн в проекции
  if (projection?.pattern) {
    return { pattern: projection.pattern, score: Infinity, confidence: "high" };
  }

  const allPatterns = buildPatternBank(ontology);

  const candidates = [];
  for (const pattern of allPatterns) {
    let score = 0;
    for (const signal of pattern.signals) {
      const fn = SIGNAL_FUNCTIONS[signal.fn];
      if (!fn) continue;
      if (fn(intents, ontology, projection, signal.match)) {
        score += signal.weight;
      }
    }
    if (score >= pattern.threshold) {
      candidates.push({ pattern: pattern.id, score, threshold: pattern.threshold });
    }
  }

  if (candidates.length === 0) {
    return { pattern: null, score: 0, confidence: "medium" };
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  let confidence;
  if (candidates.length > 1 && best.score - candidates[1].score < 2) {
    confidence = "ambiguous";
  } else if (best.score >= best.threshold * 1.5) {
    confidence = "high";
  } else {
    confidence = "medium";
  }

  return { pattern: best.pattern, score: best.score, confidence };
}

/**
 * Собрать полный банк: встроенные + domain-specific из ontology.patterns.
 * extends — наследование signals от базового паттерна.
 */
function buildPatternBank(ontology) {
  const bank = [...BUILT_IN_PATTERNS];
  const domainPatterns = ontology?.patterns || [];

  for (const dp of domainPatterns) {
    if (dp.extends) {
      const base = BUILT_IN_PATTERNS.find(p => p.id === dp.extends);
      if (base) {
        bank.push({
          ...base,
          ...dp,
          signals: [...base.signals, ...(dp.signals || [])],
        });
        continue;
      }
    }
    bank.push(dp);
  }

  return bank;
}
