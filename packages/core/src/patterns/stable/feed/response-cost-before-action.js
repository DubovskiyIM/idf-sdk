/**
 * response-cost-before-action — обогащает label intent-button'ов в toolbar
 * явной ценой, когда intent имеет costHint (monetary friction для актора).
 * Примеры: "Откликнуться" → "Откликнуться · 80 ₽", "Boost" → "Boost · 99 ₽".
 *
 * Anti-footgun семантика: скрытое списание с баланса ломает доверие;
 * явный label в CTA делает стоимость transparent до клика.
 *
 * Trigger: projection имеет ≥1 intent с `costHint` (number > 0) в `meta` или
 * `particles` или top-level. Currency default "₽".
 *
 * Apply: итерирует `slots.toolbar`, для каждого matching intent-button'а
 *   обогащает `label` суффиксом ` · {cost} {currency}`. Author-override:
 *   если label уже содержит `·` или `costHint` уже применён — no-op для item.
 *
 * Source: profi.ru + workzilla + youdo + ebay-bidding field research (2026-04-17).
 * Promoted from candidate 2026-04-20 (B2 #3).
 */

function getCostHint(intent) {
  if (typeof intent?.costHint === "number" && intent.costHint > 0) {
    return { cost: intent.costHint, currency: intent.costCurrency || "₽" };
  }
  if (typeof intent?.meta?.costHint === "number" && intent.meta.costHint > 0) {
    return { cost: intent.meta.costHint, currency: intent.meta.costCurrency || "₽" };
  }
  if (typeof intent?.particles?.costHint === "number" && intent.particles.costHint > 0) {
    return { cost: intent.particles.costHint, currency: intent.particles.costCurrency || "₽" };
  }
  return null;
}

function formatCost(cost) {
  return cost.toLocaleString("ru-RU");
}

function hasAppliedCostSuffix(label) {
  // Идемпотентность: не добавлять дважды ту же метку.
  return typeof label === "string" && /·\s+\d/.test(label);
}

function hasCostIntent(intents) {
  if (!Array.isArray(intents)) return false;
  return intents.some(i => getCostHint(i) !== null);
}

export default {
  id: "response-cost-before-action",
  version: 1,
  status: "stable",
  archetype: null, // cross: применяется и к feed, и к catalog, и к detail — везде, где есть toolbar
  trigger: {
    requires: [],
    match(intents, _ontology, projection) {
      if (!projection?.kind) return false;
      return hasCostIntent(intents);
    },
  },
  structure: {
    slot: "toolbar",
    description: "Enriches label toolbar-item'ов intent'ов с costHint — добавляет ' · {cost} {currency}' суффикс. Renderer уже отображает label; cost отображается inline.",
    /**
     * Enriches slots.toolbar items: добавляет ' · {cost} ₽' к label
     * для intent'ов с costHint. Идемпотентно по regex /·\s+\d/.
     * Чистая функция.
     */
    apply(slots, context) {
      const { intents } = context || {};
      const toolbar = Array.isArray(slots?.toolbar) ? slots.toolbar : null;
      if (!toolbar || toolbar.length === 0) return slots;
      if (!Array.isArray(intents) || intents.length === 0) return slots;

      const intentById = new Map();
      for (const intent of intents) {
        if (intent?.id) intentById.set(intent.id, intent);
      }

      let changed = false;
      const newToolbar = toolbar.map(item => {
        if (!item?.intentId) return item;
        const intent = intentById.get(item.intentId);
        if (!intent) return item;
        const cost = getCostHint(intent);
        if (!cost) return item;
        const currentLabel = item.label || intent.name || item.intentId;
        if (hasAppliedCostSuffix(currentLabel)) return item;
        changed = true;
        return {
          ...item,
          label: `${currentLabel} · ${formatCost(cost.cost)} ${cost.currency}`,
          costHint: cost.cost,
          costCurrency: cost.currency,
        };
      });

      if (!changed) return slots;
      return { ...slots, toolbar: newToolbar };
    },
  },
  rationale: {
    hypothesis: "Денежная стоимость действия для актора — скрытый frictionный сигнал. Не показать цену в CTA = превратить UI в trap (списание без уведомления). Показать до клика = доверие + меньше поддержки-тикетов. Паттерн сильнее irreversible-confirm: там риск — потеря данных, здесь — реальные деньги.",
    evidence: [
      { source: "profi.ru", description: "'Откликнуться · 80 ₽' на CTA до клика", reliability: "high" },
      { source: "workzilla", description: "Комиссия за отклик в label кнопки", reliability: "high" },
      { source: "youdo", description: "Плата за размещение отклика в CTA", reliability: "high" },
      { source: "ebay-bidding", description: "Placing a bid с комиссией в confirm-dialog", reliability: "high" },
      { source: "fiverr-boost", description: "Paid profile promotion с явной ценой в CTA", reliability: "medium" },
    ],
    counterexample: [
      { source: "free-marketplaces", description: "HH.ru / LinkedIn — отклик бесплатный, паттерн не применим", reliability: "high" },
      { source: "escrow-payment", description: "Оплата услуги исполнителю — обычный escrow flow, покрыт irreversible-confirm", reliability: "high" },
      { source: "crud-intents", description: "Обычные create/update/delete без комиссии — generic confirm", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales", projection: "listing_detail", reason: "place_bid с fee — label 'Сделать ставку · 50 ₽'" },
      { domain: "booking", projection: "tasks_feed", reason: "respond_to_task с costHint 80 — 'Откликнуться · 80 ₽'" },
      { domain: "delivery", projection: "orders_feed", reason: "claim_order с fee за принятие" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "chat_view", reason: "send_message без costHint — паттерн skip" },
      { domain: "lifequest", projection: "habits_list", reason: "check_habit — personal tracker, не monetized" },
      { domain: "planning", projection: "my_polls", reason: "vote_on_poll — бесплатное" },
      { domain: "reflect", projection: "mood-entries", reason: "log_mood — personal, бесплатное" },
    ],
  },
};
