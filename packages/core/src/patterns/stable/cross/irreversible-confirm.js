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
    /**
     * Обогащает существующие confirmDialog overlay entries полем `warning`
     * из intent.__irr.reason. Базовый overlay (message, typeText confirmation)
     * уже строит controlArchetypes.confirmDialog по intent.irreversibility.
     * Эта функция добавляет декларативное предупреждение для пользователя
     * из семантического __irr.reason — появляется над confirm-диалогом.
     *
     * Author-override (§16): управляется через projection.patterns.disabled
     * — проверяется на уровне applyStructuralPatterns, не здесь.
     *
     * Чистая функция: не мутирует входной slots.overlay или его записи.
     */
    apply(slots, context) {
      const intents = context?.intents || [];
      const byId = new Map();
      for (const intent of intents) {
        const irr = intent?.__irr;
        if (irr?.point !== "high" || !irr.reason) continue;
        const id = intent.id;
        if (!id) continue;
        byId.set(id, irr.reason);
      }
      if (byId.size === 0) return slots;

      const overlay = slots?.overlay || [];
      let changed = false;
      const nextOverlay = overlay.map(entry => {
        if (!entry || entry.type !== "confirmDialog") return entry;
        const reason = byId.get(entry.triggerIntentId);
        if (!reason) return entry;
        if (entry.warning === reason) return entry;
        changed = true;
        return { ...entry, warning: reason };
      });

      if (!changed) return slots;
      return { ...slots, overlay: nextOverlay };
    },
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
      { domain: "freelance", projection: "deal_detail_customer", reason: "accept_result: __irr.reason обогащает warning" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "goals_root", reason: "create_goal не деструктивен" },
    ],
  },
};
