export default {
  id: "vote-group",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents) {
      // ≥2 intent с creates=Entity(discriminator) — одна base entity
      const discriminated = intents.filter(i => typeof i.creates === "string" && /\(.+\)/.test(i.creates));
      if (discriminated.length < 2) return false;
      const bases = new Set(discriminated.map(i => i.creates.replace(/\(.*\)$/, "").trim()));
      return bases.size === 1;
    },
  },
  structure: { slot: "sections.itemIntents", description: "Взаимоисключающие creator-intents как voteGroup с цветными опциями" },
  rationale: {
    hypothesis: "Голосование как набор вариантов снижает когнитивную нагрузку",
    evidence: [
      { source: "doodle", description: "Poll: yes/no/maybe как цветная матрица", reliability: "high" },
      { source: "github-pr", description: "Approve/Request changes — grouped review", reliability: "medium" },
    ],
    counterexample: [
      { source: "simple-survey", description: "Одиночная Submit: не нужна группировка", reliability: "low" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "planning", projection: "poll_overview", reason: "vote_yes/vote_no/vote_maybe: creates=Vote(yes/no/maybe)" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "portfolio_detail", reason: "Нет discriminated creates" },
    ],
  },
};
