import { findSubEntities, buildSection, sectionIdFor } from "../../subEntityHelpers.js";

export default {
  id: "subcollections",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "sub-entity-exists", foreignKeyTo: "$mainEntity" },
    ],
  },
  structure: {
    slot: "sections",
    description: "Sub-entity коллекции как inline-секции с add-control и per-item actions. foreignKey определяет связь.",
    apply(slots, context) {
      const { ontology, mainEntity, intents, projection } = context;
      // Author curation (§16): если projection.subCollections задан автором —
      // apply не вмешивается. Автор имеет полный контроль над списком sub-entity.
      // §13d: проверяем также projection.slots?.subCollections (notion-style
      // nested shape — author писал sub-collections внутри slots вместо
      // top-level).
      const topLevelAuthored = Array.isArray(projection?.subCollections) && projection.subCollections.length > 0;
      const slotsAuthored = Array.isArray(projection?.slots?.subCollections) && projection.slots.subCollections.length > 0;
      if (topLevelAuthored || slotsAuthored) {
        return slots;
      }
      const subs = findSubEntities(ontology, mainEntity);
      if (subs.length === 0) return slots;
      // §13d (Notion field-test 2026-04-27): author opt-out для content-entities.
      // projection.absorbExclude уже работает в R8 (absorbHubChildren) — здесь
      // тоже фильтруем, чтобы один сигнал управлял обоими механизмами
      // (R8 hub absorption + subcollections pattern auto-derive).
      const absorbExclude = new Set(
        Array.isArray(projection?.absorbExclude) ? projection.absorbExclude : [],
      );
      const existingIds = new Set((slots?.sections || []).map(s => s.id));
      const newSections = subs
        .filter(({ entity }) => !absorbExclude.has(entity))
        .filter(({ entity }) => !existingIds.has(sectionIdFor(entity)))
        .map(({ entity, fkField }) => buildSection(entity, fkField, intents, ontology));
      if (newSections.length === 0) return slots;
      return {
        ...slots,
        sections: [...(slots?.sections || []), ...newSections],
      };
    },
  },
  rationale: {
    hypothesis: "Related entities inline снижают navigation cost vs отдельная проекция",
    evidence: [
      { source: "linear", description: "Issue detail: sub-tasks, comments inline", reliability: "high" },
      { source: "stripe", description: "Payment detail: line items, events inline", reliability: "high" },
    ],
    counterexample: [
      { source: "salesforce", description: "Related lists на отдельных табах — лишний клик", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "planning", projection: "poll_overview", reason: "TimeOption.pollId + Participant.pollId" },
      { domain: "invest", projection: "portfolio_detail", reason: "Position.portfolioId + Transaction.portfolioId" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "portfolios_root", reason: "catalog, не detail" },
    ],
  },
};
