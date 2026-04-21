/**
 * Reference in-memory реализация Persistence.
 * Используется для тестов и dev. Не thread-safe, не durable.
 * @returns {import('./types.js').Persistence}
 */
export function createInMemoryPersistence() {
  /** @type {Map<string, import('./types.js').Effect>} */
  const effects = new Map();
  /** @type {Map<string, import('./types.js').RuleState>} */
  const ruleStates = new Map();

  const keyRule = (ruleId, userId) => `${ruleId}::${userId}`;

  return {
    async appendEffect(effect) {
      if (!effect?.id) throw new Error("Effect must have id");
      effects.set(effect.id, { ...effect });
    },

    async readEffects(filter = {}) {
      const out = [];
      for (const e of effects.values()) {
        if (filter.status && e.status !== filter.status) continue;
        if (filter.since != null && e.created_at < filter.since) continue;
        out.push({ ...e });
      }
      out.sort((a, b) => a.created_at - b.created_at);
      return out;
    },

    async updateStatus(id, status, opts = {}) {
      const e = effects.get(id);
      if (!e) return;
      e.status = status;
      if (opts.reason != null) e.reason = opts.reason;
      if (opts.resolvedAt != null) e.resolved_at = opts.resolvedAt;
      else e.resolved_at = Date.now();
    },

    ruleState: {
      async get(ruleId, userId) {
        return ruleStates.get(keyRule(ruleId, userId)) ?? { counter: 0, lastFiredAt: null };
      },
      async set(ruleId, userId, patch) {
        const prev = ruleStates.get(keyRule(ruleId, userId)) ?? { counter: 0, lastFiredAt: null };
        ruleStates.set(keyRule(ruleId, userId), { ...prev, ...patch });
      },
    },
  };
}
