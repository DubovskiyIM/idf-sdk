export default {
  id: "antagonist-toggle",
  version: 1,
  status: "stable",
  archetype: "feed",
  trigger: {
    requires: [],
    match(intents) {
      return intents.some(i => i.antagonist && intents.some(j => (j.id || "") === i.antagonist));
    },
  },
  structure: { slot: "header", description: "Антагонистические пары (pin/unpin, mute/unmute) как toggle-кнопки в header" },
  rationale: {
    hypothesis: "Бинарные состояния лучше как toggle чем как две отдельные кнопки",
    evidence: [
      { source: "slack", description: "Pin/unpin message toggle", reliability: "high" },
      { source: "telegram", description: "Mute/unmute conversation toggle", reliability: "high" },
    ],
    counterexample: [
      { source: "generic", description: "Если состояний >2, toggle не подходит", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "messenger", projection: "chat_view", reason: "pin_message/unpin_message: antagonist pair" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "portfolios_root", reason: "catalog, нет antagonist pairs" },
    ],
  },
};
