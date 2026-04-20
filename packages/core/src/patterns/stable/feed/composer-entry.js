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
  structure: {
    slot: "composer",
    description: "Composer-поле внизу feed для быстрого создания mainEntity",
    /**
     * Apply: формализует SDK `composerEntry` archetype — маркирует
     * `slots.composer` с `source: "derived:composer-entry"`. Если slot
     * пуст (feed без composerEntry-intent), no-op.
     *
     * Idempotent.
     */
    apply(slots, context) {
      const composer = slots?.composer;
      if (!composer || typeof composer !== "object") return slots;
      if (composer.source === "derived:composer-entry") return slots;
      return {
        ...slots,
        composer: { ...composer, source: "derived:composer-entry" },
      };
    },
  },
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
