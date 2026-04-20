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
  structure: {
    slot: "header",
    description: "Антагонистические пары (pin/unpin, mute/unmute) как toggle-кнопки в header",
    /**
     * Apply: находит antagonist-пары intents (A.antagonist === B.id), emit'ит
     * `slots._toggles` — массив пар { a, b } для renderer'а. Renderer может
     * слить эти пары в один toggle-button вместо двух отдельных.
     *
     * Shape:
     *   slots._toggles = [
     *     { a: "pin_message", b: "unpin_message" },
     *     { a: "mute_conv",   b: "unmute_conv"   },
     *   ]
     *
     * SDK уже пакует пары в overflow через collapseToolbar. Apply
     * формализует метку pair'а на slots level — renderer использует
     * для toggle-виджета (а не pair-в-overflow).
     *
     * Idempotent.
     */
    apply(slots, context) {
      const { intents } = context || {};
      if (!Array.isArray(intents)) return slots;

      const byId = new Map();
      for (const i of intents) if (i?.id) byId.set(i.id, i);

      const pairs = [];
      const seen = new Set();
      for (const intent of intents) {
        if (!intent?.antagonist || !intent.id) continue;
        const a = intent.id;
        const b = intent.antagonist;
        if (!byId.has(b)) continue;
        const key = [a, b].sort().join("::");
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({ a, b });
      }
      if (pairs.length === 0) return slots;
      if (Array.isArray(slots?._toggles) && slots._toggles.length > 0) return slots;

      return {
        ...slots,
        _toggles: pairs,
        _togglesSource: "derived:antagonist-toggle",
      };
    },
  },
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
