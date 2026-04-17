export default {
  id: "footer-inline-setter",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      const mainLower = (projection?.mainEntity || "").toLowerCase();
      return intents.some(i => {
        const params = i.parameters || [];
        if (params.length !== 1) return false;
        const effects = i.particles?.effects || [];
        return effects.length === 1 && effects[0].α === "replace" &&
          typeof effects[0].target === "string" && effects[0].target.startsWith(mainLower + ".");
      });
    },
  },
  structure: { slot: "footer", description: "Single-param replace intent как inline-setter: label [input] Установить" },
  rationale: {
    hypothesis: "Поля, которые меняются часто и атомарно (deadline, priority), лучше как inline-setters",
    evidence: [
      { source: "linear", description: "Due date setter: inline в footer", reliability: "high" },
      { source: "notion", description: "Property inline edit", reliability: "high" },
    ],
    counterexample: [
      { source: "complex-form", description: "Cascading поля: inline setter опасен", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "planning", projection: "poll_overview", reason: "set_deadline: 1 param, replace poll.deadline" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "portfolio_detail", reason: "set_target_allocation: 4 параметра" },
    ],
  },
};
