/**
 * reputation-tier-badge (stable, cross). Merge-промоция из 4 candidate'ов:
 *   - tier-badge-marker (fl.ru)             — boolean isPro → бейдж
 *   - derived-tier-badge (workzilla)        — enum tier от threshold
 *   - trust-signal-mini-card (kwork)        — badge в карточке
 *   - trust-signal-badges-on-card (workzilla) — собрание бейджей
 *
 * Общая семантика: у entity (User / Specialist / Seller / Merchant)
 * есть поле с трастовым смыслом — boolean (isPro/verified/trusted) или
 * enum ранга (novice/specialist/pro/master). Визуализируется бейдж в
 * header detail-проекции + inline в card на catalog.
 *
 * Trigger: entity имеет поле с именем в trust-whitelist ИЛИ enum-options
 * содержащий tier-значения (novice/pro/master/verified/...).
 *
 * Apply:
 *  detail → добавляет `{type:"tierBadge", bind:"<field>"}` в header.
 *  catalog → добавляет tier-маркер в cardSpec.badges[] (рендерер
 *  использует в `<TierBadge>` primitive).
 */

const TRUST_FIELD_NAMES = new Set([
  "isPro", "isPremium", "verified", "isVerified", "trusted", "isTrusted",
  "tier", "rank", "level", "reputation", "reputationTier",
]);

const TIER_ENUM_VALUES = new Set([
  "novice", "specialist", "pro", "master", "expert", "elite",
  "gold", "silver", "bronze", "platinum", "premium",
  "verified", "trusted",
]);

function detectTierField(entityDef) {
  const fields = entityDef?.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return null;
  for (const [name, def] of Object.entries(fields)) {
    if (TRUST_FIELD_NAMES.has(name)) {
      return { field: name, kind: def?.type === "boolean" ? "boolean" : "enum", fieldDef: def };
    }
    if (Array.isArray(def?.options)) {
      const matches = def.options.some(v =>
        typeof v === "string" && TIER_ENUM_VALUES.has(v.toLowerCase()),
      );
      if (matches) return { field: name, kind: "enum", fieldDef: def };
    }
  }
  return null;
}

export default {
  id: "reputation-tier-badge",
  version: 1,
  status: "stable",
  archetype: null, // cross: применяется и к catalog и к detail
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      if (!projection?.mainEntity) return false;
      const kind = projection?.kind;
      if (kind !== "catalog" && kind !== "detail") return false;
      if (projection?.tierBadge === false) return false;
      const entity = ontology?.entities?.[projection.mainEntity];
      return detectTierField(entity) != null;
    },
  },
  structure: {
    slot: "header",
    description:
      "Для detail инжектим tierBadge в header. Для catalog — добавляем " +
      "маркер в body.cardSpec.badges (Renderer'у остаётся показать " +
      "bubble в углу карточки).",
    apply(slots, context) {
      const { projection, ontology } = context || {};
      const entity = ontology?.entities?.[projection?.mainEntity];
      const detected = detectTierField(entity);
      if (!detected) return slots;

      const kind = projection?.kind;
      if (kind === "detail") {
        const header = slots?.header || [];
        if (header.some(n => n?.type === "tierBadge")) return slots;
        return {
          ...slots,
          header: [
            ...header,
            { type: "tierBadge", bind: detected.field, variant: detected.kind },
          ],
        };
      }

      if (kind === "catalog") {
        const body = slots?.body || {};
        const existing = body.cardSpec?.badges || [];
        if (existing.some(b => b?.bind === detected.field)) return slots;
        return {
          ...slots,
          body: {
            ...body,
            cardSpec: {
              ...(body.cardSpec || {}),
              badges: [
                ...existing,
                { bind: detected.field, variant: detected.kind, kind: "tier" },
              ],
            },
          },
        };
      }

      return slots;
    },
  },
  rationale: {
    hypothesis:
      "Trust-бейдж работает как signal доверия И capability-gate одновременно. " +
      "Без видимого бейджа capability-gating становится сюрпризом " +
      "(«почему не могу написать?»). Derived enum tier даёт калиброванную " +
      "шкалу доверия.",
    evidence: [
      { source: "fl.ru",         description: "PRO-бейдж рядом с именем фрилансера",       reliability: "high" },
      { source: "workzilla",     description: "tier ∈ {novice,specialist,pro,master}",     reliability: "high" },
      { source: "kwork",         description: "Mini-card с trust signals",                  reliability: "high" },
      { source: "github",        description: "Verified badge на org-профилях",             reliability: "high" },
      { source: "stackoverflow", description: "reputation → derived privileges/badges",     reliability: "high" },
      { source: "airbnb",        description: "Superhost бейдж на карточке и профиле",      reliability: "high" },
    ],
    counterexample: [
      { source: "wikipedia",     description: "Tier system без бейджа — community-norm",    reliability: "medium" },
    ],
    mergeSources: [
      "candidate/bank/2026-04-19-fl-ru-projects-board-tier-badge-marker.json",
      "candidate/bank/2026-04-19-workzilla-marketplace-derived-tier-badge.json",
      "candidate/bank/2026-04-19-kwork-service-packages-trust-signal-mini-card.json",
      "candidate/bank/2026-04-19-workzilla-marketplace-trust-signal-badges-on-card.json",
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "freelance", projection: "executor_detail",
        reason: "User.isPro или User.tier (derived)" },
      { domain: "sales",     projection: "seller_catalog",
        reason: "Seller.verified boolean" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "message_detail",
        reason: "нет tier-field у Message" },
      { domain: "lifequest", projection: "goal_detail",
        reason: "personal entity без reputation концепта" },
    ],
  },
};
