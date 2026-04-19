/**
 * computed-cta-label (stable, detail). Merge-промоция из 3 кандидатов:
 *   - multi-select-extras-live-total (kwork)  — live-пересчёт суммы при
 *     выборе extras
 *   - derived-total-in-cta (kwork)             — сумма в CTA-кнопке
 *   - paid-modifier-composer (fl.ru)           — платные опции с
 *     live-сумой
 *
 * Общая семантика: primary CTA-кнопка detail-проекции показывает derived
 * total (цена + выбранные extras) в своём label'е. Label пересчитывается
 * реактивно при изменении formState (выбор extras / modifiers).
 *
 * Trigger: у mainEntity есть money-поле (price/amount/cost) + есть creator-
 * intent (Order/Deal/Purchase) + у детализации есть child-entity
 * *Extra* / *Modifier* / *AddOn* (или polymorphic value-фильд).
 *
 * Apply: `slots.primaryCTA[].labelTemplate` — декларативный шаблон
 * "Заказать за {computed.total} ₽". Рендерер связывает computed.total с
 * formState (base price + selected extras).
 */

import { inferFieldRole } from "../../../crystallize_v2/ontologyHelpers.js";

const EXTRA_SUFFIXES = ["Extra", "Extras", "Modifier", "Modifiers", "AddOn", "AddOns", "Option"];

function hasMoneyField(entityDef) {
  const fields = entityDef?.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return null;
  for (const [name, def] of Object.entries(fields)) {
    const role = inferFieldRole(name, def || {})?.role;
    if (role === "money" || role === "price") return name;
    if (/price|amount|cost|total|fee/i.test(name)) return name;
  }
  return null;
}

function hasExtrasChild(ontology, parentEntity) {
  const entities = ontology?.entities;
  if (!entities) return null;
  for (const [name, def] of Object.entries(entities)) {
    if (name === parentEntity) continue;
    const matchesSuffix = EXTRA_SUFFIXES.some(s => name.endsWith(s));
    if (!matchesSuffix) continue;
    const fields = def?.fields;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) continue;
    // FK на parent + money-field
    const hasFK = Object.keys(fields).some(n =>
      n.toLowerCase() === parentEntity.toLowerCase() + "id" ||
      n.toLowerCase().endsWith(parentEntity.toLowerCase() + "id"),
    );
    const hasPrice = Object.keys(fields).some(n =>
      /price|amount|cost|fee/i.test(n),
    );
    if (hasFK && hasPrice) return name;
  }
  return null;
}

function findOrderCreator(intents, parentEntity) {
  const CREATABLE = new Set(["Order", "Purchase", "Booking", "Deal", "Checkout", "Subscription"]);
  const lowerParent = (parentEntity || "").toLowerCase();
  for (const intent of intents || []) {
    const creates = typeof intent?.creates === "string"
      ? intent.creates.replace(/\(.*\)$/, "").trim()
      : null;
    if (!creates) continue;
    if (CREATABLE.has(creates)) return intent;
    // Косвенно: creates ребёнка, FK которого указывает на parentEntity
    if (creates.toLowerCase().startsWith(lowerParent)) continue;
  }
  return null;
}

export default {
  id: "computed-cta-label",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      if (projection?.kind !== "detail") return false;
      if (projection?.computedCta === false) return false;
      const mainEntity = projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      if (!hasMoneyField(entity)) return false;
      if (!hasExtrasChild(ontology, mainEntity)) return false;
      return !!findOrderCreator(intents, mainEntity);
    },
  },
  structure: {
    slot: "primaryCTA",
    description:
      "Primary CTA получает labelTemplate = \"{intent.verb} за {computed.total} {currency}\". " +
      "Рендерер биндит computed.total на base-price + sum(selected extras).",
    apply(slots, context) {
      const { projection, ontology, intents } = context || {};
      const mainEntity = projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      const priceField = hasMoneyField(entity);
      if (!priceField) return slots;
      const extrasEntity = hasExtrasChild(ontology, mainEntity);
      if (!extrasEntity) return slots;
      const creator = findOrderCreator(intents, mainEntity);
      if (!creator) return slots;

      const list = slots?.primaryCTA || [];
      if (list.some(c => c?.intentId === creator.id && c.labelTemplate)) return slots;
      const idx = list.findIndex(c => c?.intentId === creator.id);

      const computedSpec = {
        basePrice: `${mainEntity.toLowerCase()}.${priceField}`,
        extrasEntity,
        parentField: priceField,
      };

      const next = { ...(list[idx] || {
        intentId: creator.id,
        label: creator.name || creator.id,
        icon: creator.icon || "💳",
        conditions: creator.particles?.conditions || [],
        parameters: creator.parameters || [],
      }), labelTemplate: "{label} за {computed.total}", computed: computedSpec };

      const newList = list.slice();
      if (idx >= 0) newList[idx] = next;
      else newList.push(next);

      return { ...slots, primaryCTA: newList };
    },
  },
  rationale: {
    hypothesis:
      "Цена — главный friction на покупке. Встраивая её в label CTA-кнопки " +
      "мы делаем кнопку price-witness: виден actual charge, убран шаг " +
      "\"а сколько\".",
    evidence: [
      { source: "kwork.ru",     description: "Заказать за 1500₽ — live при выборе extras",     reliability: "high" },
      { source: "stripe",       description: "Checkout CTA с derived total",                    reliability: "high" },
      { source: "shopify",      description: "Add to cart — showing total with variants",       reliability: "high" },
      { source: "apple.com",    description: "\"Купить за $999\" с конфигуратором",            reliability: "high" },
      { source: "uber",         description: "\"Request UberX for $18.50\" — real-time price", reliability: "high" },
    ],
    counterexample: [
      { source: "book-trial",   description: "Free trial — нет total, label просто \"Start trial\"",  reliability: "high" },
      { source: "vote",         description: "Voting button — нет денежного контекста",               reliability: "high" },
    ],
    mergeSources: [
      "candidate/bank/2026-04-19-kwork-service-packages-multi-select-extras-live-total.json",
      "candidate/bank/2026-04-19-kwork-service-packages-derived-total-in-cta.json",
      "candidate/bank/2026-04-19-fl-ru-projects-board-paid-modifier-composer.json",
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales",    projection: "listing_detail",
        reason: "Listing.price + ListingExtra + create_order" },
      { domain: "delivery", projection: "menu_item_detail",
        reason: "MenuItem.price + MenuItemAddOn + create_order" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "message_detail",
        reason: "нет money-field у Message" },
      { domain: "lifequest", projection: "goal_detail",
        reason: "нет extras / monetization" },
    ],
  },
};
