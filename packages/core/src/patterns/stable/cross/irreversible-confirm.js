export default {
  id: "irreversible-confirm",
  version: 1,
  status: "stable",
  archetype: null,  // cross-archetype
  trigger: {
    requires: [],
    match(intents) {
      return intents.some(i => i.irreversibility === "high");
    },
  },
  structure: {
    slot: "overlay",
    description: "confirmDialog с typeText confirmation для высоко-необратимых действий.",
  },
  rationale: {
    hypothesis: "Деструктивные действия требуют явного подтверждения — снижает случайные потери",
    evidence: [
      { source: "github", description: "Delete repo: type name to confirm", reliability: "high" },
      { source: "stripe", description: "Cancel subscription: confirmation dialog", reliability: "high" },
    ],
    counterexample: [
      { source: "early-gmail", description: "Delete without undo: жалобы → добавили undo", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "planning", projection: "poll_overview", reason: "cancel_poll: irreversibility=high" },
      { domain: "invest", projection: "portfolio_detail", reason: "archive_portfolio: irreversibility=high" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "goals_root", reason: "create_goal не деструктивен" },
    ],
  },
};
