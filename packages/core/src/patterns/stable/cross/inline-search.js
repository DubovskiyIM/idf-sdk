export default {
  id: "inline-search",
  version: 1,
  status: "stable",
  archetype: null,
  trigger: {
    requires: [],
    match(intents) {
      return intents.some(i => {
        const w = i.particles?.witnesses || [];
        return w.includes("query") && w.includes("results") && (i.particles?.entities || []).length === 0;
      });
    },
  },
  structure: { slot: "toolbar", description: "Search input в toolbar как projection-level utility" },
  rationale: {
    hypothesis: "Поиск — универсальная утилита, не привязанная к конкретной сущности",
    evidence: [
      { source: "linear", description: "Cmd+K universal search", reliability: "high" },
      { source: "slack", description: "Search bar в toolbar", reliability: "high" },
    ],
    counterexample: [
      { source: "legacy-crm", description: "Поиск на отдельной странице — friction", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "messenger", projection: "conversations_list", reason: "search_conversations: witnesses query+results, entities=[]" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "portfolios_root", reason: "Нет search intent с query+results" },
    ],
  },
};
