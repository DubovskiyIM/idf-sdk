/**
 * explainCrystallize — unified query over all witness basis.
 *
 * Принимает artifact (результат crystallizeV2) и возвращает структурированное
 * объяснение его происхождения: какие правила сработали, какие паттерны
 * совпали, какие witnesses привнесли поля, в каком порядке.
 *
 * Главный consumer — CrystallizeInspector в §27 Studio. Также:
 * derivation-spec-debt.mjs, near-miss analyzers, Pattern Inspector overlay.
 *
 * Спецификация: idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md
 *
 * @module crystallize_v2/explainCrystallize
 */

/**
 * Known witness basis strings в порядке старшинства для trace[]:
 *
 *   crystallize-rule     — R1/R1b/R2/R3/R4/R6/R7/R9/R10 деривация структуры
 *   polymorphic-variant  — discriminator/variants выведен из онтологии
 *   temporal-section     — eventTimeline секции
 *   pattern-bank         — structural patterns (subcollections, grid-card, ...)
 *   alphabetical-fallback — tie-break witness для intent salience
 *   authored             — синтетический для authored проекций (без derivedBy)
 */
const BASIS_ORDER = [
  "crystallize-rule",
  "polymorphic-variant",
  "temporal-section",
  "pattern-bank",
  "alphabetical-fallback",
  "authored",
];

/**
 * Classify origin проекции по наличию crystallize-rule witnesses.
 */
function classifyOrigin(witnesses) {
  const hasRuleWitness = witnesses.some(w => w.basis === "crystallize-rule");
  if (hasRuleWitness) {
    const hasEnrichmentRule = witnesses.some(w => w.basis === "crystallize-rule" && ["R4", "R6", "R9"].includes(w.ruleId));
    const hasOriginRule = witnesses.some(w => w.basis === "crystallize-rule" && ["R1", "R1b", "R2", "R3", "R7", "R10"].includes(w.ruleId));
    if (hasOriginRule) return hasEnrichmentRule ? "derived+enriched" : "derived";
    if (hasEnrichmentRule) return "authored+enriched";
  }
  return "authored";
}

/**
 * @param {object} artifact — результат crystallizeV2[projId]
 * @param {object} [options]
 * @param {boolean} [options.includeMatched=true] — включать pattern-bank matches
 * @returns {{
 *   projection: string,
 *   archetype: string,
 *   origin: "authored" | "derived" | "derived+enriched" | "authored+enriched",
 *   witnessesByBasis: Record<string, object[]>,
 *   ruleIds: string[],
 *   patternIds: string[],
 *   trace: Array<{step: number, basis: string, ruleId?: string, pattern?: string, rationale?: string}>,
 *   summary: string,
 * }}
 */
export function explainCrystallize(artifact, options = {}) {
  if (!artifact || typeof artifact !== "object") {
    throw new TypeError("explainCrystallize: artifact must be an object");
  }
  const witnesses = Array.isArray(artifact.witnesses) ? artifact.witnesses : [];

  // Group by basis
  const witnessesByBasis = {};
  for (const w of witnesses) {
    const basis = w.basis || "unknown";
    if (!witnessesByBasis[basis]) witnessesByBasis[basis] = [];
    witnessesByBasis[basis].push(w);
  }

  // Extract rule IDs (from crystallize-rule basis)
  const ruleIds = (witnessesByBasis["crystallize-rule"] || []).map(w => w.ruleId).filter(Boolean);
  // Extract pattern IDs (from pattern-bank basis)
  const patternIds = (witnessesByBasis["pattern-bank"] || []).map(w => w.pattern).filter(Boolean);

  // Build trace: preserve relative order of witnesses in the artifact (they go first by basis order).
  // For each witness produce a step entry.
  const trace = [];
  let stepNumber = 0;
  for (const basis of BASIS_ORDER) {
    const list = witnessesByBasis[basis];
    if (!list) continue;
    for (const w of list) {
      stepNumber++;
      trace.push({
        step: stepNumber,
        basis,
        ruleId: w.ruleId,
        pattern: w.pattern,
        rationale: w.rationale,
      });
    }
  }

  const origin = classifyOrigin(witnesses);

  const summary = buildSummary(artifact, origin, ruleIds, patternIds);

  return {
    projection: artifact.projection,
    archetype: artifact.archetype,
    origin,
    witnessesByBasis,
    ruleIds,
    patternIds,
    trace,
    summary,
  };
}

function buildSummary(artifact, origin, ruleIds, patternIds) {
  const parts = [];
  parts.push(`${artifact.archetype || "?"} "${artifact.projection}"`);
  switch (origin) {
    case "derived": parts.push("выведена правилами"); break;
    case "derived+enriched": parts.push("выведена + обогащена"); break;
    case "authored+enriched": parts.push("авторская + обогащена правилами"); break;
    default: parts.push("авторская без derivation origin");
  }
  if (ruleIds.length > 0) parts.push(`правила: ${[...new Set(ruleIds)].sort().join(", ")}`);
  if (patternIds.length > 0) parts.push(`паттерны: ${[...new Set(patternIds)].sort().join(", ")}`);
  return parts.join(" · ");
}

/**
 * Batch-вариант для artifacts map. Возвращает { projId: explanation }.
 * @param {Record<string, object>} artifacts
 * @param {object} [options]
 */
export function explainAllCrystallize(artifacts, options = {}) {
  const out = {};
  for (const [projId, artifact] of Object.entries(artifacts || {})) {
    if (!artifact) continue;
    out[projId] = explainCrystallize(artifact, options);
  }
  return out;
}
