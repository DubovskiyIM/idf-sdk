/**
 * review-criterion-breakdown — inject'ит section "Оценка по критериям" в
 * `slots.sections` detail-проекции перед секцией отзывов. Секция рендерит
 * bar-chart average'ов по каждому criterion field sub-entity.
 *
 * Trigger: mainEntity имеет sub-entity (обычно Review) с ≥3 number-полями,
 * чьи имена match `*_rating`/`*_score` или fieldRole:"rating", ИЛИ поле
 * `criteria: object`.
 *
 * Apply: добавляет в `slots.sections` перед section'ом-обычных-отзывов
 *   { id, type: "criterionSummary", source: "derived:review-criterion-breakdown",
 *     subEntity, fkField, criteria: [{field, label}], title }.
 * Renderer рендерит horizontal bar-chart.
 *
 * Author-override: если `sections` уже содержит `{type:"criterionSummary"}` —
 * no-op.
 *
 * Source: profi.ru + booking.com + airbnb field research (2026-04-17-18).
 * Promoted from candidate 2026-04-20 (B2 #2).
 */
import { findSubEntities } from "../../subEntityHelpers.js";

// Распознавание criterion-поля: имя match *_rating/*_score или fieldRole:"rating",
// либо короткое lowercase-имя из списка distributions (quality/punctuality/etc.).
const CRITERION_NAMES = new Set([
  "quality", "punctuality", "politeness", "price", "cleanliness", "accuracy",
  "communication", "location", "value", "speed", "comfort", "staff",
  "packaging", "professionalism", "responsiveness",
]);

function isCriterionField(name, def) {
  if (!def || typeof def !== "object") return false;
  if (def.fieldRole === "rating") return true;
  if (def.type !== "number") return false;
  if (/_(rating|score)$/i.test(name)) return true;
  if (CRITERION_NAMES.has(name.toLowerCase())) return true;
  return false;
}

function findCriterionFields(subEntity, ontology) {
  const entity = ontology?.entities?.[subEntity];
  if (!entity?.fields) return [];
  const result = [];
  for (const [name, def] of Object.entries(entity.fields)) {
    if (isCriterionField(name, def)) {
      result.push({ field: name, label: def.label || humanize(name) });
    }
  }
  return result;
}

function humanize(name) {
  return name
    .replace(/_(rating|score)$/i, "")
    .replace(/_/g, " ")
    .replace(/^./, s => s.toUpperCase());
}

function findSubEntityWithCriteria(ontology, mainEntity) {
  const subs = findSubEntities(ontology, mainEntity);
  for (const sub of subs) {
    const criteria = findCriterionFields(sub.entity, ontology);
    if (criteria.length >= 3) return { ...sub, criteria };
  }
  return null;
}

export default {
  id: "review-criterion-breakdown",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      if (projection?.kind !== "detail") return false;
      return findSubEntityWithCriteria(ontology, projection?.mainEntity) !== null;
    },
  },
  structure: {
    slot: "sections",
    description: "Section 'Оценка по критериям' с bar-chart average'ов criterion-полей sub-entity. Вставляется перед Review-секцией.",
    /**
     * Enriches slots.sections: prepend'ит criterionSummary section.
     * Author-override: existing {type:"criterionSummary"} в sections → no-op.
     * Чистая функция.
     */
    apply(slots, context) {
      const { ontology, projection } = context || {};
      const found = findSubEntityWithCriteria(ontology, projection?.mainEntity);
      if (!found) return slots;

      const sections = Array.isArray(slots?.sections) ? slots.sections : [];
      if (sections.some(s => s?.type === "criterionSummary")) return slots;

      const section = {
        id: `criterion_summary_${found.entity.toLowerCase()}`,
        type: "criterionSummary",
        source: "derived:review-criterion-breakdown",
        subEntity: found.entity,
        fkField: found.fkField,
        criteria: found.criteria,
        title: "Оценка по критериям",
      };
      return { ...slots, sections: [section, ...sections] };
    },
  },
  rationale: {
    hypothesis: "Единый общий рейтинг теряет signal — пользователь не видит, за что именно низкий балл. Multi-dim breakdown даёт actionable trust-signal, позволяет ранжировать по личным приоритетам, даёт исполнителю корректирующий feedback.",
    evidence: [
      { source: "profi.ru", description: "'Качество 4.9 / Пунктуальность 4.8 / Вежливость 5.0' над secionом отзывов", reliability: "high" },
      { source: "booking.com", description: "Hotel breakdown: Cleanliness / Comfort / Location / Staff / Value", reliability: "high" },
      { source: "airbnb", description: "Listing breakdown: Accuracy / Communication / Cleanliness / Location / Check-in / Value", reliability: "high" },
      { source: "yandex-taxi", description: "Driver rating breakdown в приложении после поездки", reliability: "medium" },
    ],
    counterexample: [
      { source: "amazon", description: "Product reviews — только overall rating, breakdown по criterion не применим", reliability: "medium" },
      { source: "app-store", description: "Apps — 5-звёзд без breakdown работает, UX не многомерен", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "booking", projection: "specialist_profile", reason: "Specialist + Review с полями quality/punctuality/communication" },
      { domain: "delivery", projection: "courier_profile", reason: "Courier + Review с speed/politeness/packaging" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "listing_detail", reason: "Listing имеет overall rating без подкритериев" },
      { domain: "lifequest", projection: "habit_detail", reason: "Habit не имеет Review sub-entity" },
      { domain: "messenger", projection: "chat_view", reason: "Conversation не имеет рейтинговых sub-entity" },
    ],
  },
};
