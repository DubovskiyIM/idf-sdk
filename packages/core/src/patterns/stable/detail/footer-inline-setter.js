export default {
  id: "footer-inline-setter",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      const mainLower = (projection?.mainEntity || "").toLowerCase();
      return intents.some(i => {
        const params = i.parameters || [];
        if (params.length !== 1) return false;
        const effects = i.particles?.effects || [];
        return effects.length === 1 && effects[0].α === "replace" &&
          typeof effects[0].target === "string" && effects[0].target.startsWith(mainLower + ".");
      });
    },
  },
  structure: {
    slot: "footer",
    description: "Single-param replace intent как inline-setter: label [input] Установить",
    /**
     * Обогащает slots.footer: переносит single-param replace intent'ы
     * из toolbar в footer как inline-setters (shape `{ intentId, label,
     * conditions, parameters }`).
     *
     * Author-override (§16): если intent уже присутствует в `slots.footer`
     * (автор объявил через `projection.footerIntents`), pattern для него
     * — no-op: не перетирает и не дублирует. Toolbar-элемент с тем же
     * intentId также не изымается — автор уже сам решил его судьбу.
     *
     * Чистая функция: не мутирует входной slots / toolbar / footer.
     * Возвращает исходный объект slots, когда нечего переносить.
     */
    apply(slots, context) {
      const { projection, intents } = context || {};
      const mainEntity = projection?.mainEntity || "";
      const mainLower = mainEntity.toLowerCase();
      const existingFooterIds = new Set((slots?.footer || []).map(f => f?.intentId));
      const toolbarItems = slots?.toolbar || [];
      const newFooterItems = [];
      const toolbarIdsToStrip = new Set();

      for (const intent of intents || []) {
        const intentId = intent?.id;
        if (!intentId) continue;
        if (existingFooterIds.has(intentId)) continue;
        const params = intent.parameters || [];
        if (params.length !== 1) continue;
        const effects = intent.particles?.effects || [];
        if (effects.length !== 1 || effects[0].α !== "replace") continue;
        const target = effects[0].target;
        if (typeof target !== "string" || !target.startsWith(mainLower + ".")) continue;
        const toolbarItem = toolbarItems.find(t => t?.intentId === intentId);
        if (!toolbarItem) continue;
        newFooterItems.push({
          intentId,
          label: intent.name,
          conditions: intent.particles?.conditions || [],
          parameters: toolbarItem.parameters || [],
        });
        toolbarIdsToStrip.add(intentId);
      }

      if (newFooterItems.length === 0) return slots;
      const newToolbar = toolbarItems.filter(t => !toolbarIdsToStrip.has(t?.intentId));
      return {
        ...slots,
        toolbar: newToolbar,
        footer: [...(slots?.footer || []), ...newFooterItems],
      };
    },
  },
  rationale: {
    hypothesis: "Поля, которые меняются часто и атомарно (deadline, priority), лучше как inline-setters",
    evidence: [
      { source: "linear", description: "Due date setter: inline в footer", reliability: "high" },
      { source: "notion", description: "Property inline edit", reliability: "high" },
    ],
    counterexample: [
      { source: "complex-form", description: "Cascading поля: inline setter опасен", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "planning", projection: "poll_overview", reason: "set_deadline: 1 param, replace poll.deadline" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "portfolio_detail", reason: "set_target_allocation: 4 параметра" },
    ],
  },
};
