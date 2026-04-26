/**
 * salienceFeatures.js — явный 13-фичный вектор для weighted-sum salience.
 *
 * Каждая feature — наблюдаемый атрибут intent'а в контексте проекции и онтологии.
 * Результат используется в salienceFromFeatures (salience.js) для вычисления
 * числового salience через линейную комбинацию Σ wᵢ · featureᵢ.
 *
 * Контракт: FEATURE_KEYS фиксирован; новые ключи добавляются только в minor-версиях.
 *
 * ctx = { projection, ONTOLOGY, intentUsage?: { [intentId]: number } }
 *   intentUsage — сколько раз intent используется / насколько он «горячий» в домене.
 *   Если не передан или usageCount нет — domainFrequency вычисляется из значений 1.
 */

/**
 * Взять последнюю часть после `:` и trim.
 * Нужно для intent.particles.entities типа "order: Order" (alias-формат).
 */
const stripAlias = (s) => String(s).split(":").pop().trim();

export const FEATURE_KEYS = [
  "explicitNumber",
  "explicitTier",
  "tier1CanonicalEdit",
  "tier2EditLike",
  "tier3Promotion",
  "tier4ReplaceMain",
  "creatorMain",
  "phaseTransition",
  "irreversibilityHigh",
  "removeMain",
  "readOnly",
  "ownershipMatch",
  "domainFrequency",
];

const TIER_ALIAS = { primary: 1, secondary: 0.5, tertiary: 0.2, utility: 0.05 };

/**
 * Извлечь вектор фич для intent в контексте ctx.
 *
 * @param {Object} intent — объект intent (может содержать поле id)
 * @param {{ projection: Object, ONTOLOGY: Object, intentUsage?: Object }} ctx
 * @returns {Record<string, number>} вектор фич размерностью FEATURE_KEYS.length
 */
export function extractSalienceFeatures(intent, ctx) {
  const { projection, ONTOLOGY, intentUsage = {} } = ctx || {};
  const mainEntity = projection?.mainEntity;
  const lowerMain = String(mainEntity || "").toLowerCase();
  const id = intent?.id || "";
  const particles = intent?.particles || {};
  const effects = particles.effects || [];
  const conditions = particles.conditions || [];
  const ownerField = ONTOLOGY?.entities?.[mainEntity]?.ownerField;

  // Инициализировать все фичи нулём
  const f = Object.fromEntries(FEATURE_KEYS.map((k) => [k, 0]));

  // --- Explicit salience ---
  if (typeof intent?.salience === "number") {
    f.explicitNumber = Math.max(0, Math.min(1, intent.salience / 100));
  }
  if (typeof intent?.salience === "string" && TIER_ALIAS[intent.salience] != null) {
    f.explicitTier = TIER_ALIAS[intent.salience];
  }

  // --- Tier-based: edit/update/rename ---
  if (lowerMain && new RegExp(`^(edit|update)_${lowerMain}$`).test(id)) {
    f.tier1CanonicalEdit = 1;
  }
  if (/^(edit|update|rename)/.test(id)) {
    f.tier2EditLike = 1;
  }

  // --- Tier3: promotion verbs ---
  if (/^(publish|confirm|submit|accept|approve|complete|resolve|finalize)/.test(id)) {
    f.tier3Promotion = 1;
  }

  // --- Tier4: replace on mainEntity without conditions (unconditional edit) ---
  const hasReplaceOnMain = effects.some((e) => {
    if (e.α !== "replace") return false;
    const targetEntity = String(e.target || "").split(".")[0];
    return targetEntity.toLowerCase() === lowerMain;
  });
  if (hasReplaceOnMain && conditions.length === 0) {
    f.tier4ReplaceMain = 1;
  }

  // --- Creator of mainEntity ---
  if (intent?.creates === mainEntity) {
    f.creatorMain = 1;
  }

  // --- Phase transition: replace on .status or .phase ---
  if (effects.some((e) => e.α === "replace" && /\.(status|phase)$/.test(String(e.target || "")))) {
    f.phaseTransition = 1;
  }

  // --- Irreversibility high ---
  if (effects.some((e) => e?.context?.__irr?.point === "high")) {
    f.irreversibilityHigh = 1;
  }

  // --- Remove mainEntity ---
  if (
    effects.some((e) => {
      if (e.α !== "remove") return false;
      const target = stripAlias(String(e.target || "").split(".")[0]);
      return target.toLowerCase() === lowerMain;
    })
  ) {
    f.removeMain = 1;
  }

  // --- Read-only (нет effects вообще) ---
  if (effects.length === 0) {
    f.readOnly = 1;
  }

  // --- Ownership match: entities содержит mainEntity с ownerField или сам mainEntity ---
  // Формат entity-ref может быть:
  //   "Booking"               → прямое имя сущности
  //   "Booking:customerId"    → entity:ownerField (без пробелов)
  //   "booking: customerId"   → alias-формат с пробелами
  if (ownerField) {
    const refs = (particles.entities || []).map(String);
    if (
      refs.some((r) => {
        const alias = stripAlias(r); // последняя часть после ':'
        // alias совпадает с ownerField или именем mainEntity
        if (alias === ownerField || alias === mainEntity) return true;
        // stripAlias может дать имя сущности (в "Booking:customerId" alias="customerId")
        // проверим также первую часть (до ':') как имя сущности
        const parts = r.split(":");
        const entityPart = parts[0].trim();
        if (entityPart === mainEntity || entityPart.toLowerCase() === lowerMain) return true;
        // r === mainEntity целиком
        if (r === mainEntity) return true;
        return false;
      })
    ) {
      f.ownershipMatch = 1;
    }
  }

  // --- Domain frequency ---
  const total = Object.values(intentUsage).reduce((a, b) => a + b, 0);
  f.domainFrequency = total > 0 ? (intentUsage[id] || 0) / total : 0;

  return f;
}
