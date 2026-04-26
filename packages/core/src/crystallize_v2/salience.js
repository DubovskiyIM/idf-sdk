/**
 * Intent salience — формальный tiebreaker для slot-contention (§16 PoC).
 *
 * Проблема: когда M > N intent'ов валидно конкурируют за слот capacity N,
 * алгоритм вынужден использовать implicit tiebreaker. До функториального
 * фикса им был `Object.entries` порядок (порядок авторства). После —
 * алфавитный порядок id. Оба критерия детерминированы, но семантически
 * неадекватны: `apply_template` не primary для Listing лишь потому, что
 * его id алфавитно раньше `edit_listing`.
 *
 * Salience делает приоритизацию первоклассным понятием. Два уровня:
 *
 *   1. Explicit — автор объявляет `intent.salience`
 *      - число: любая величина, больше = primary
 *      - строка: "primary" | "secondary" | "tertiary" | "utility"
 *
 *   2. Computed — вывод из particles по набору правил:
 *      - creator mainEntity                → 80
 *      - phase-transition (status change)  → 70
 *      - replace на main entity            → 60
 *      - effect без явной привязки         → 40 (default)
 *      - remove на main entity             → 30 (destructive ниже edit)
 *      - read-only / utility               → 10
 *
 * Tied (равный salience) — tie-break ladder:
 *   1. declarationOrder (insertion order в INTENTS-object) — authorial signal,
 *      автор кладёт важнее вперёд
 *   2. alphabetical по id — last-resort, практически unreachable (declarationOrder
 *      уникален между двумя intents в одном INTENTS-object)
 *
 * Witness `basis: "declaration-order"` — резолюция через tier 1 (норма).
 * Witness `basis: "alphabetical-fallback"` — через tier 2 (редко, когда
 * declarationOrder не передан или одинаковый у обоих tied entries).
 *
 * Применение в PoC: только в assignToSlotsDetail для сортировки standalone
 * кнопок toolbar перед срезом capacity=3. Остальные слоты пока не затронуты.
 */

import { normalizeCreates } from "./assignToSlotsShared.js";
import { extractSalienceFeatures, FEATURE_KEYS } from "./salienceFeatures.js";

const LABEL_MAP = {
  primary: 100,
  secondary: 50,
  tertiary: 20,
  utility: 5,
};

/**
 * Веса по умолчанию для weighted-sum salience (Phase 2).
 *
 * Откалиброваны вручную чтобы воспроизвести поведение implicit ladder:
 * - tier1CanonicalEdit / creatorMain ≈ 80 (как в computeSalience)
 * - tier3Promotion ≈ 70 (phase-transition)
 * - tier4ReplaceMain ≈ 60 (edit main)
 * - removeMain ≈ 30 (destructive ниже edit)
 * - readOnly ≈ 10
 *
 * Подбор на labeled-dataset (21 суждение) — отдельный host-скрипт
 * salience-fit-weights.mjs (Task 2.3 в idf).
 *
 * projection.salienceWeights мержится поверх этих значений на уровне
 * bySalienceDesc — автор может усилить одну фичу для конкретной проекции.
 */
export const DEFAULT_SALIENCE_WEIGHTS = {
  explicitNumber: 100,
  explicitTier: 100,
  tier1CanonicalEdit: 80,
  tier2EditLike: 50,
  tier3Promotion: 70,
  tier4ReplaceMain: 60,
  creatorMain: 80,
  phaseTransition: 40,
  irreversibilityHigh: 35,
  removeMain: 30,
  readOnly: 10,
  ownershipMatch: 15,
  domainFrequency: 20,
};

/**
 * Линейная комбинация Σ wᵢ · featureᵢ.
 *
 * @param {Record<string, number>} features — результат extractSalienceFeatures
 * @param {Record<string, number>} [weights] — по умолчанию DEFAULT_SALIENCE_WEIGHTS
 * @returns {number}
 */
export function salienceFromFeatures(features, weights = DEFAULT_SALIENCE_WEIGHTS) {
  let s = 0;
  for (const [k, v] of Object.entries(features)) {
    if (typeof v !== "number") continue;
    s += v * (weights[k] || 0);
  }
  return s;
}

// Re-export для удобства вызова из одного модуля
export { extractSalienceFeatures, FEATURE_KEYS };

/**
 * Вычислить salience для intent в контексте mainEntity.
 *
 * @param {Object} intent
 * @param {string|null} mainEntity — главная сущность проекции (для которой detail/catalog)
 * @returns {{ value: number, source: "explicit" | "computed", reason: string }}
 */
export function computeSalience(intent, mainEntity) {
  // Explicit override
  if (typeof intent?.salience === "number") {
    return { value: intent.salience, source: "explicit", reason: "intent.salience:number" };
  }
  if (typeof intent?.salience === "string" && intent.salience in LABEL_MAP) {
    return {
      value: LABEL_MAP[intent.salience],
      source: "explicit",
      reason: `intent.salience:${intent.salience}`,
    };
  }

  // Computed defaults
  const creates = normalizeCreates(intent?.creates);
  if (creates && creates === mainEntity) {
    return { value: 80, source: "computed", reason: "creator-of-main" };
  }

  const effects = intent?.particles?.effects || [];
  const mainLower = (mainEntity || "").toLowerCase();

  const touchesMain = (e) => {
    if (typeof e?.target !== "string") return false;
    const t = e.target.toLowerCase();
    return t === mainLower || t.startsWith(mainLower + ".");
  };

  const replacesMainStatus = effects.some(
    (e) => e.α === "replace" && typeof e.target === "string" && e.target.endsWith(".status") && touchesMain(e)
  );
  if (replacesMainStatus) {
    return { value: 70, source: "computed", reason: "phase-transition" };
  }

  const replacesMain = effects.some((e) => e.α === "replace" && touchesMain(e));
  if (replacesMain) {
    return { value: 60, source: "computed", reason: "edit-main" };
  }

  const removesMain = effects.some((e) => e.α === "remove" && touchesMain(e));
  if (removesMain) {
    return { value: 30, source: "computed", reason: "destructive-main" };
  }

  if (effects.length === 0) {
    return { value: 10, source: "computed", reason: "read-only" };
  }

  return { value: 40, source: "computed", reason: "default" };
}

/**
 * Comparator для сортировки standalone toolbar-кнопок.
 *
 * Button: { intentId, salience: number, declarationOrder?: number }.
 * - salience пробрасывается из assignToSlots.
 * - declarationOrder — index в Object.entries(INTENTS); authorial signal
 *   «я поставил это раньше потому что оно важнее». Опционален; без него
 *   fallback на alphabetical.
 *
 * Tie-break ladder: salience desc → declarationOrder asc → alphabetical asc.
 *
 * @param {Object} a — кнопка/intent A
 * @param {Object} b — кнопка/intent B
 * @param {Object|null} [ctx] — опциональный контекст для weighted-sum:
 *   { projection, ONTOLOGY, intentUsage? }
 *   Если ctx передан — вычисляем salience через salienceFromFeatures.
 *   Если ctx == null — backward-compat: используем pre-computed salience-поле.
 */
export function bySalienceDesc(a, b, ctx) {
  if (ctx != null) {
    // Weighted-sum режим: ctx = { projection, ONTOLOGY, intentUsage? }
    const weights = { ...DEFAULT_SALIENCE_WEIGHTS, ...(ctx.projection?.salienceWeights || {}) };
    // a и b — объекты с intentId; нужно достать intent с id для extractSalienceFeatures
    const intentA = { id: a.intentId, ...a };
    const intentB = { id: b.intentId, ...b };
    const sA = salienceFromFeatures(extractSalienceFeatures(intentA, ctx), weights);
    const sB = salienceFromFeatures(extractSalienceFeatures(intentB, ctx), weights);
    if (sA !== sB) return sB - sA;
  } else {
    // Backward-compat: используем pre-computed salience-поле из assignToSlots
    const sA = a.salience ?? 40;
    const sB = b.salience ?? 40;
    if (sA !== sB) return sB - sA;
  }

  // Tier 2: declarationOrder asc (authorial signal)
  const dA = typeof a.declarationOrder === "number" ? a.declarationOrder : Infinity;
  const dB = typeof b.declarationOrder === "number" ? b.declarationOrder : Infinity;
  if (dA !== dB) return dA - dB;

  // Tier 3: alphabetical asc (last resort)
  return (a.intentId || "").localeCompare(b.intentId || "");
}

/**
 * Классифицировать tie-resolution между двумя intents для witness-basis.
 * Используется в collapseToolbar для правильной пометки резолюции.
 *
 * Returns: "salience" | "declaration-order" | "alphabetical-fallback"
 */
export function classifyTieResolution(a, b) {
  const sA = a.salience ?? 40;
  const sB = b.salience ?? 40;
  if (sA !== sB) return "salience";

  const dA = typeof a.declarationOrder === "number" ? a.declarationOrder : Infinity;
  const dB = typeof b.declarationOrder === "number" ? b.declarationOrder : Infinity;
  if (dA !== dB) return "declaration-order";

  return "alphabetical-fallback";
}

/**
 * Найти группы элементов с равным salience в **уже отсортированном** массиве.
 * Tied (≥2 элемента с одинаковым salience) → порядок определяется
 * alphabetical tie-break'ом, что делает выбор детерминированным, но
 * семантически пустым. Формат должен помечать такие выборы явно:
 *
 *   artifact.witnesses.push({
 *     basis: "alphabetical-fallback",
 *     reliability: "heuristic",            // не rule-based!
 *     slot, projection,
 *     chosen, peers,
 *     recommendation,
 *   })
 *
 * «Spec smell» становится first-class содержимым артефакта — Studio
 * может подсвечивать эти случаи, автор видит неполноту спеки.
 *
 * Элементы без `intentId` (type:"overflow", type:"divider") пропускаются.
 *
 * @param {Array<{intentId?: string, salience?: number}>} sortedItems
 * @param {{slot: string, projection: string}} ctx
 * @returns {Array} witness records
 */
export function detectTiedGroups(sortedItems, { slot, projection }) {
  const items = sortedItems.filter((i) => typeof i?.intentId === "string");
  const witnesses = [];
  let i = 0;
  while (i < items.length) {
    const salience = items[i].salience ?? 40;
    const start = i;
    while (i < items.length && (items[i].salience ?? 40) === salience) i++;
    const group = items.slice(start, i);
    if (group.length < 2) continue;

    // Проверяем, все ли declarationOrder в группе уникальны:
    // - уникальны → резолюция через authorial order (tier 1), witness-basis
    //   "declaration-order". Менее шумно, не требует intent.salience.
    // - есть duplicates → fallback на alphabetical (tier 2), witness-basis
    //   "alphabetical-fallback". Практически недостижимо в одном INTENTS-object
    //   (Object.entries даёт уникальный index), встречается только при merged
    //   domains или ручной сборке toolbar'ов.
    const orders = group.map((x) => (typeof x.declarationOrder === "number" ? x.declarationOrder : Infinity));
    const uniqueOrders = new Set(orders);
    const hasDupOrder = uniqueOrders.size < orders.length;
    const basis = hasDupOrder ? "alphabetical-fallback" : "declaration-order";

    const groupIds = group.map((x) => x.intentId);
    const [chosen, ...peers] = groupIds;
    const recommendation = basis === "declaration-order"
      ? `Порядок разрешён по declaration-order в INTENTS (authorial signal). Если хотите явно закрепить — проставьте intent.salience одному из [${groupIds.join(", ")}].`
      : `Проставьте intent.salience одному из [${groupIds.join(", ")}] чтобы зафиксировать порядок явно.`;

    witnesses.push({
      basis,
      reliability: "heuristic",
      slot,
      projection,
      salience,
      chosen,
      peers,
      recommendation,
    });
  }
  return witnesses;
}
