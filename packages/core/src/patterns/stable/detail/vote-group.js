export default {
  id: "vote-group",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents) {
      // ≥2 intent с creates=Entity(discriminator) с ОДИНАКОВОЙ base entity
      const discriminated = intents.filter(i => typeof i.creates === "string" && /\(.+\)/.test(i.creates));
      if (discriminated.length < 2) return false;
      // Группировка по base: хотя бы одна группа с ≥2
      const groups = {};
      for (const i of discriminated) {
        const base = i.creates.replace(/\(.*\)$/, "").trim();
        groups[base] = (groups[base] || 0) + 1;
      }
      return Object.values(groups).some(count => count >= 2);
    },
  },
  structure: {
    slot: "sections.itemIntents",
    description: "Взаимоисключающие creator-intents как voteGroup с цветными опциями",
    /**
     * Apply: группирует intents с `creates: "Entity(variant)"` по base entity.
     * Emit metadata в `slots._voteGroups` — map { baseEntity → variants[] }.
     * Renderer (SubCollectionItem / ArchetypeDetail) читает эту metadata и
     * заменяет дублирующиеся intent-buttons единой voteGroup-виджет.
     *
     * Shape:
     *   slots._voteGroups = {
     *     Vote: [
     *       { intentId: "vote_yes", value: "yes", label: "Да" },
     *       { intentId: "vote_no",  value: "no",  label: "Нет" },
     *       { intentId: "vote_maybe", value: "maybe", label: "Может быть" },
     *     ],
     *   }
     *
     * Author-override: existing `slots._voteGroups` → no-op (idempotent).
     * Renderer-integration с sections.itemIntents — future work.
     */
    apply(slots, context) {
      const { intents } = context || {};
      if (!Array.isArray(intents)) return slots;

      const groups = {};
      for (const intent of intents) {
        if (typeof intent.creates !== "string") continue;
        const match = /^([A-Za-z_]+)\((.+)\)$/.exec(intent.creates);
        if (!match) continue;
        const [, base, variant] = match;
        if (!groups[base]) groups[base] = [];
        groups[base].push({
          intentId: intent.id,
          value: variant.trim(),
          label: intent.name || intent.id,
        });
      }

      // Оставляем только группы ≥ 2 variants (singletons не voteGroup).
      const validGroups = {};
      for (const [base, variants] of Object.entries(groups)) {
        if (variants.length >= 2) validGroups[base] = variants;
      }
      if (Object.keys(validGroups).length === 0) return slots;

      if (slots?._voteGroups) return slots;

      return {
        ...slots,
        _voteGroups: {
          ...validGroups,
          _source: "derived:vote-group",
        },
      };
    },
  },
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
