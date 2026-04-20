/**
 * UX Pattern Layer — public API.
 *
 * resolvePattern(intents, ontology, projection) → { pattern, score, confidence, strategy }
 * explainMatch(intents, ontology, projection, options) → единая точка для Studio viewer и inspector
 */

export { classifyPattern } from "./classifier.js";
export { buildStrategy, DEFAULT_STRATEGY } from "./strategy.js";
export { BUILT_IN_PATTERNS } from "./bank.js";
export { createRegistry, getDefaultRegistry, loadStablePatterns } from "./registry.js";
export { validatePattern, evaluateTrigger } from "./schema.js";
export { computeSlotAttribution } from "./slotAttribution.js";

import { classifyPattern } from "./classifier.js";
import { buildStrategy } from "./strategy.js";
import { crystallizeV2 } from "../crystallize_v2/index.js";
import { getDefaultRegistry, loadStablePatterns } from "./registry.js";
import { evaluateTriggerExplained } from "./schema.js";

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

/**
 * Explain pattern match — единая точка для Studio viewer и prototype inspector.
 *
 * Возвращает behavioral pattern (resolvePattern), structural patterns (matched + optional nearMiss),
 * witnesses (§15 shape), и artifactBefore / artifactAfter для live preview применения одного
 * конкретного паттерна.
 *
 * @param {Array|object} intents — массив intent-объектов или map {id: intent}
 * @param {object} ontology
 * @param {object} projection
 * @param {{includeNearMiss?: boolean, previewPatternId?: string}} [options]
 * @returns {{
 *   archetype: string,
 *   behavioral: {pattern: string|null, score: number, confidence: string, strategy: object},
 *   structural: {matched: Array, nearMiss: Array},
 *   witnesses: Array,
 *   artifactBefore: object,
 *   artifactAfter: object|null,
 *   previewPatternId: string|null,
 * }}
 */
export function explainMatch(intents, ontology, projection, options = {}) {
  const registry = getDefaultRegistry();
  loadStablePatterns(registry);

  const archetype = projection?.kind || "catalog";

  // intents могут прийти и как массив, и как map; нормализуем обе формы.
  const intentsArr = Array.isArray(intents)
    ? intents
    : Object.entries(intents || {}).map(([id, intent]) => ({ id, ...intent }));
  const intentsMap = Array.isArray(intents)
    ? Object.fromEntries(intents.map(i => [i.id, i]))
    : (intents || {});

  const behavioral = resolvePattern(intentsArr, ontology, projection);

  // matchPatterns возвращает разную форму в зависимости от includeNearMiss:
  //   includeNearMiss: true  → { matched: [{pattern, explain}], nearMiss: [{pattern, explain, missing}] }
  //   includeNearMiss: false → legacy array of patterns (без explain)
  const structuralRaw = registry.matchPatterns(
    intentsArr,
    ontology,
    projection,
    { includeNearMiss: !!options.includeNearMiss },
  );
  const matched = Array.isArray(structuralRaw)
    ? structuralRaw.map(p => ({
        pattern: p,
        explain: evaluateTriggerExplained(p.trigger, intentsArr, ontology, projection),
      }))
    : structuralRaw.matched;
  const nearMiss = Array.isArray(structuralRaw) ? [] : structuralRaw.nearMiss;

  // witnesses — §15 shape, однозначная таблица "basis + pattern + requirements + matchFn"
  const witnesses = matched.map(({ pattern, explain }) => ({
    basis: "pattern-bank",
    pattern: pattern.id,
    reliability: "rule-based",
    requirements: explain.requirements.map(r => ({ kind: r.kind, ok: r.ok, spec: r.spec })),
    matchFn: explain.matchFn,
    matchOk: explain.matchOk,
  }));

  // artifactBefore — кристаллизация без structure.apply (feature-flag временно выключен).
  // Реальная сигнатура crystallizeV2: (INTENTS, PROJECTIONS, ONTOLOGY, domainId?, opts?).
  const projId = projection?.id || "_preview";
  const ontologyWithoutApply = {
    ...ontology,
    features: { ...(ontology?.features || {}), structureApply: false },
  };
  const artifactsBefore = crystallizeV2(
    intentsMap,
    { [projId]: projection },
    ontologyWithoutApply,
    "_preview",
    {},
  );
  const artifactBefore = artifactsBefore[projId] || null;

  // artifactAfter — применение одного конкретного паттерна из previewPatternId.
  // structure.apply принимает SLOTS (не артефакт целиком) и возвращает обогащённый slots-bag.
  // Архетипы-рендереры читают из artifact.slots.*, поэтому обогащать надо именно slot-ветку.
  let artifactAfter = null;
  let previewPatternId = null;
  if (options.previewPatternId) {
    const pattern = registry.getPattern(options.previewPatternId);
    if (pattern && typeof pattern.structure?.apply === "function") {
      const applyContext = {
        ontology,
        mainEntity: projection?.mainEntity,
        intents: intentsArr,
        projection,
      };
      const nextSlots = pattern.structure.apply(artifactBefore?.slots || {}, applyContext);
      artifactAfter = { ...artifactBefore, slots: nextSlots };
      previewPatternId = options.previewPatternId;
    }
  }

  return {
    archetype,
    behavioral,
    structural: { matched, nearMiss },
    witnesses,
    artifactBefore,
    artifactAfter,
    previewPatternId,
  };
}
