export default {
  id: "phase-aware-primary-cta",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "entity-field", field: "status", type: "select", minOptions: 3 },
      { kind: "intent-effect", α: "replace", targetSuffix: ".status", irreversibility: ["low", "medium"] },
    ],
  },
  structure: {
    slot: "primaryCTA",
    description: "Phase-changing intents как крупные primary-кнопки внизу body. Деструктивные (high) — в toolbar через confirmDialog.",
    /**
     * Apply: формализует SDK behavior (`assignToSlotsDetail` уже маршрутит
     * phase-transition intents в `slots.primaryCTA`). Marks items с
     * `source: "derived:phase-aware-primary-cta"` — renderer может
     * применять pattern-specific стили (крупные кнопки, визуальное
     * выделение "что делать дальше").
     *
     * Idempotent.
     */
    apply(slots, context) {
      const { mainEntity } = context || {};
      if (!mainEntity) return slots;
      const primary = slots?.primaryCTA;
      if (!Array.isArray(primary) || primary.length === 0) return slots;
      const needsTag = primary.some(item => item && !item.source);
      if (!needsTag) return slots;
      const tagged = primary.map(item =>
        item && !item.source
          ? { ...item, source: "derived:phase-aware-primary-cta" }
          : item
      );
      return { ...slots, primaryCTA: tagged };
    },
  },
  rationale: {
    hypothesis: "Визуальное разделение фазовых переходов от деструктивных действий улучшает понимание 'что делать дальше'",
    evidence: [
      { source: "linear", description: "Issue workflow: status transitions как primary actions", reliability: "high" },
      { source: "github", description: "PR: merge button отделён от close/dismiss", reliability: "high" },
    ],
    counterexample: [
      { source: "old-jira", description: "Status change через dropdown в toolbar", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "planning", projection: "poll_overview", reason: "Poll.status: 5 values + open/close/resolve intents" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "portfolio_detail", reason: "Portfolio нет status select field" },
    ],
  },
};
