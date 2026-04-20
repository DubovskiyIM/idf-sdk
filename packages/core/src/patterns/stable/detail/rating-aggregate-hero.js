/**
 * rating-aggregate-hero — обогащает `slots.header` detail-проекции aggregate
 * "⭐ avg · count" из sub-entity с ratingField (Review и т.п.).
 *
 * Trigger: mainEntity имеет sub-entity с FK на него, и у sub-entity есть
 * поле с fieldRole:"rating" или name match rating/score/grade (number type).
 *
 * Apply: добавляет в `slots.header` spec-node
 *   { type: "ratingAggregate", source: "derived:rating-aggregate-hero",
 *     subEntity, fkField, ratingField, label: "отзывов" }.
 * Renderer рендерит inline: "⭐ 4.9 · 128 отзывов".
 *
 * Author-override: если `slots.header` уже содержит `{type:"ratingAggregate"}`
 * — no-op.
 *
 * Source: avito.ru + airbnb + google-maps field research (2026-04-18).
 * Promoted from candidate 2026-04-20 (B2 pilot).
 */
import { findSubEntities } from "../../subEntityHelpers.js";

function findRatingField(subEntity, ontology) {
  const entity = ontology?.entities?.[subEntity];
  if (!entity?.fields) return null;
  for (const [name, def] of Object.entries(entity.fields)) {
    if (!def || typeof def !== "object") continue;
    if (def.fieldRole === "rating") return name;
    if (def.type !== "number") continue;
    // Name-hint: rating / score / stars / grade
    if (/^(rating|score|stars|grade)$/i.test(name)) return name;
  }
  return null;
}

function findSubEntityWithRating(ontology, mainEntity) {
  const subs = findSubEntities(ontology, mainEntity);
  for (const sub of subs) {
    const rf = findRatingField(sub.entity, ontology);
    if (rf) return { ...sub, ratingField: rf };
  }
  return null;
}

function countLabel(subEntity) {
  // Простая русификация — для стандартных sub-entity имён.
  const map = {
    Review: "отзывов",
    Rating: "оценок",
    Feedback: "отзывов",
  };
  return map[subEntity] || "записей";
}

export default {
  id: "rating-aggregate-hero",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      if (projection?.kind !== "detail") return false;
      return findSubEntityWithRating(ontology, projection?.mainEntity) !== null;
    },
  },
  structure: {
    slot: "header",
    description: "Inline aggregate '⭐ avg · N отзывов' в header detail-проекции, вычисляется из sub-entity с rating field.",
    /**
     * Enriches `slots.header` prepending ratingAggregate spec.
     * Author-override: если уже есть header item с type:"ratingAggregate" — no-op.
     * Чистая функция.
     */
    apply(slots, context) {
      const { ontology, projection } = context || {};
      const found = findSubEntityWithRating(ontology, projection?.mainEntity);
      if (!found) return slots;

      const header = Array.isArray(slots?.header) ? slots.header : [];
      if (header.some(h => h?.type === "ratingAggregate")) return slots;

      const node = {
        type: "ratingAggregate",
        source: "derived:rating-aggregate-hero",
        subEntity: found.entity,
        fkField: found.fkField,
        ratingField: found.ratingField,
        countLabel: countLabel(found.entity),
      };
      return { ...slots, header: [node, ...header] };
    },
  },
  rationale: {
    hypothesis: "Rating — derived-signal над sub-collection. Без aggregate в hero пользователь скроллит до Reviews-tab чтобы понять trust-level, это top-of-funnel friction. Discrete ⭐+count даёт сигнал за O(1).",
    evidence: [
      { source: "avito-services", description: "«4.9 · 128 отзывов» под именем исполнителя, кликабельно до Reviews", reliability: "high" },
      { source: "airbnb", description: "Listing hero: «★ 4.87 · 243 reviews» рядом с title", reliability: "high" },
      { source: "google-maps", description: "Place detail: rating + review count в hero", reliability: "high" },
      { source: "yelp", description: "Business hero: stars + review count", reliability: "high" },
    ],
    counterexample: [
      { source: "linear", description: "Issue detail — Reviews-подколлекции нет, aggregate не применим", reliability: "high" },
      { source: "stripe-payment", description: "Payment detail — rating-семантика отсутствует", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "booking", projection: "specialist_detail", reason: "Specialist — Review sub-entity с rating-полем" },
      { domain: "sales", projection: "listing_detail", reason: "Listing имеет Review-подколлекцию с rating" },
      { domain: "delivery", projection: "merchant_detail", reason: "Merchant — Review с rating" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "conversation_detail", reason: "Conversation без rating-подколлекции" },
      { domain: "invest", projection: "portfolio_detail", reason: "Sub-entities есть (Position/Transaction), но rating отсутствует" },
      { domain: "planning", projection: "poll_detail", reason: "Vote — discrete choice, не continuous score" },
    ],
  },
};
