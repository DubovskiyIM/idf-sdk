export default {
  id: "composer-entry",
  version: 1,
  status: "stable",
  archetype: "feed",
  trigger: {
    requires: [
      { kind: "intent-creates", entity: "$mainEntity" },
      { kind: "intent-confirmation", confirmation: "enter" },
    ],
  },
  structure: { slot: "composer", description: "Composer-поле внизу feed для быстрого создания mainEntity" },
  rationale: {
    hypothesis: "Chat-style ввод оптимален для потоковых сущностей (сообщения, комментарии)",
    evidence: [
      { source: "telegram", description: "Message composer: text input + send", reliability: "high" },
      { source: "slack", description: "Thread composer с attachments", reliability: "high" },
    ],
    counterexample: [
      { source: "email-compose", description: "Full-page compose: оправдано для длинных форм", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "messenger", projection: "chat_view", reason: "send_message: confirmation=enter, creates=Message" },
    ],
    shouldNotMatch: [
      { domain: "planning", projection: "my_polls", reason: "catalog, не feed" },
    ],
  },
};
