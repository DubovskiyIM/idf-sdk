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
      const { ontology, mainEntity, intents } = context;
      const subs = findSubEntities(ontology, mainEntity);
      if (subs.length === 0) return slots;
      const existingIds = new Set((slots?.sections || []).map(s => s.id));
      const newSections = subs
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
