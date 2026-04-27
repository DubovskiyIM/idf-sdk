/**
 * Joint salience+slot solver — Phase 1 (pure-функции).
 *
 * Параллельно с существующим assignToSlots*; интеграция — Phase 2 после
 * parity tests. Cost matrix + greedy assignment, без Hungarian (Phase 2).
 *
 * Backlog: docs/superpowers/specs/2026-04-26-core-backlog.md § A2.
 * Plan: docs/superpowers/plans/2026-04-26-joint-solver-phase1.md
 */

const ROLE_PRIMARY = "primary";
const ROLE_SECONDARY = "secondary";
const ROLE_NAVIGATION = "navigation";
const ROLE_UTILITY = "utility";
const ROLE_DESTRUCTIVE = "destructive";
const ROLE_UNSPECIFIED = "unspecified";

export const INFINITY_COST = Number.POSITIVE_INFINITY;

/**
 * Классифицировать intent в одну или несколько slot-ролей.
 *
 * Salience tier:
 *   ≥ 80    → primary
 *   60-79   → secondary
 *   30-59   → navigation (с explicit salience)
 *   < 30    → utility
 *   no anno → unspecified (Phase 4 — новый tier)
 *
 * Destructive flag (orthogonal): remove-эффект на mainEntity → +destructive.
 *
 * Phase 4 finding (idf docs jointsolver-divergent): 100% divergent intents
 * не имели explicit intent.salience — все default 40 → navigation tier
 * → подходили во все slots (inclusive defaults) → slot declaration order
 * dominated outcome. Solution: distinguishable tier `unspecified` для
 * unannotated intents — fits только в overflow slots (overlay/footer/toolbar),
 * не в primary placement slots (hero/primaryCTA). Author может explicit
 * salience override → классический tier.
 *
 * @param {Object} intent — intent definition (с salience и particles)
 * @param {string} [mainEntity] — для destructive проверки
 * @returns {string[]} — массив ролей (минимум одна)
 */
export function classifyIntentRole(intent, mainEntity) {
  const roles = [];
  // Phase 4: distinguish author-explicit от system-computed salience.
  // _salienceSource === "explicit" — author declared intent.salience.
  // _salienceSource === "computed" — bridge enriched через computeSalience
  //                                  (heuristic из particles).
  // absent — direct user of classifyIntentRole без enrichment.
  const hasExplicit = typeof intent?.salience === "number"
    && (intent._salienceSource === undefined || intent._salienceSource === "explicit");

  if (hasExplicit) {
    const salience = intent.salience;
    if (salience >= 80) roles.push(ROLE_PRIMARY);
    else if (salience >= 60) roles.push(ROLE_SECONDARY);
    else if (salience >= 30) roles.push(ROLE_NAVIGATION);
    else roles.push(ROLE_UTILITY);
  } else {
    // Phase 4: unannotated или computed-only intents — overflow tier,
    // не претендуют на primary slots без явного author signal.
    roles.push(ROLE_UNSPECIFIED);
  }

  // Destructive — orthogonal: remove на mainEntity
  const effects = intent?.particles?.effects || [];
  const mainLower = (mainEntity || "").toLowerCase();
  const isDestructive = effects.some((e) => {
    if (e?.α !== "remove" && e?.alpha !== "remove") return false;
    const t = typeof e?.target === "string" ? e.target.toLowerCase() : "";
    return t === mainLower || t.startsWith(mainLower + ".");
  });
  if (isDestructive) roles.push(ROLE_DESTRUCTIVE);

  return roles;
}

/**
 * Построить cost-матрицу для (intent_i, slot_s).
 *
 * Семантика:
 *   cost[i][s] = -salience(intent_i) если slot принимает intent (по ролям)
 *   cost[i][s] = INFINITY_COST       иначе
 *
 * Capacity penalty + ergonomic penalty + conflict penalty — Phase 2.
 *
 * @param {Object} opts
 * @param {Array<Object>} opts.intents
 * @param {Record<string, { capacity: number, allowedRoles: string[] }>} opts.slots
 * @param {string} [opts.mainEntity]
 * @returns {{
 *   cost: number[][],
 *   rowIndex: Map<string, number>,
 *   colIndex: Map<string, number>,
 *   slotNames: string[],
 *   intentIds: string[],
 * }}
 */
export function buildCostMatrix({ intents, slots, mainEntity }) {
  const slotNames = Object.keys(slots);
  const intentIds = intents.map((i) => i.id);
  const rowIndex = new Map(intentIds.map((id, i) => [id, i]));
  const colIndex = new Map(slotNames.map((name, i) => [name, i]));

  const cost = intents.map((intent) => {
    const roles = classifyIntentRole(intent, mainEntity);
    const salience = typeof intent?.salience === "number" ? intent.salience : 40;
    return slotNames.map((name) => {
      const slot = slots[name];
      const allowed = slot.allowedRoles || [];
      const fits = roles.some((r) => allowed.includes(r));
      return fits ? -salience : INFINITY_COST;
    });
  });

  return { cost, rowIndex, colIndex, slotNames, intentIds };
}

/**
 * Greedy distribution intents по слотам через cost matrix.
 *
 * Алгоритм:
 *   1. Сортируем intent indices по min-cost asc (= max-salience среди
 *      допустимых slot'ов).
 *   2. Для каждого intent: pick slot с min cost где capacity > 0.
 *   3. Если все cost = INFINITY — unassigned + witness "ill-conditioned".
 *
 * Stable: при равных min-cost'ах берётся slot в declaration order
 * (Object.keys(slots)).
 *
 * @param {ReturnType<typeof buildCostMatrix>} matrix
 * @param {Record<string, { capacity: number, allowedRoles: string[] }>} slots
 * @returns {{
 *   assignment: Map<string, string>,
 *   unassigned: string[],
 *   witnesses: Array<{ basis: string, reliability: string, intentId: string, reason: string }>,
 * }}
 */
export function greedyAssign(matrix, slots) {
  const { cost, intentIds, slotNames } = matrix;

  // Capacity tracking — локальный счётчик, не мутируем slots
  const capacityLeft = new Map(slotNames.map((s) => [s, slots[s].capacity]));

  // Sort intent indices by min-cost asc
  const indices = intentIds.map((_, i) => i);
  const minCostOf = (i) => Math.min(...cost[i]);
  indices.sort((a, b) => {
    const ma = minCostOf(a);
    const mb = minCostOf(b);
    if (ma !== mb) return ma - mb;
    return a - b; // declaration order tie-break
  });

  const assignment = new Map();
  const unassigned = [];
  const witnesses = [];

  for (const i of indices) {
    const intentId = intentIds[i];
    let bestSlot = null;
    let bestCost = INFINITY_COST;

    for (let j = 0; j < slotNames.length; j++) {
      const slotName = slotNames[j];
      if (capacityLeft.get(slotName) <= 0) continue;
      if (cost[i][j] >= INFINITY_COST) continue;
      if (cost[i][j] < bestCost) {
        bestCost = cost[i][j];
        bestSlot = slotName;
      }
    }

    if (bestSlot == null) {
      unassigned.push(intentId);
      witnesses.push({
        basis: "ill-conditioned",
        reliability: "rule-based",
        intentId,
        reason: "no-feasible-slot-with-capacity",
      });
    } else {
      assignment.set(intentId, bestSlot);
      capacityLeft.set(bestSlot, capacityLeft.get(bestSlot) - 1);
    }
  }

  return { assignment, unassigned, witnesses };
}
