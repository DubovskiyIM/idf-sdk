// Квалификация footer-inline-setter: intent с ровно одним replace-эффектом
// на поле mainEntity (`entityLower.field`). Семантически — «один value-param»:
// сам field в target является единственным вводимым значением. Авторские
// parameters (если объявлены) имеют entity-ref для mainEntity как implicit
// context → их счётчик не надёжен и здесь не используется.
function isSingleValueReplaceOnMain(intent, mainEntity) {
  const mainLower = (mainEntity || "").toLowerCase();
  const effects = intent?.particles?.effects || [];
  if (effects.length !== 1 || effects[0].α !== "replace") return false;
  const target = effects[0].target;
  if (typeof target !== "string" || !target.startsWith(mainLower + ".")) return false;
  // Target должен быть именно `entityLower.field`, без глубокой вложенности
  // (`entity.subObj.field` — не single-setter, скорее nested form).
  const rest = target.slice(mainLower.length + 1);
  return rest.length > 0 && !rest.includes(".");
}

export default {
  id: "footer-inline-setter",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      const mainEntity = projection?.mainEntity;
      return (intents || []).some(i => isSingleValueReplaceOnMain(i, mainEntity));
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
      const existingFooterIds = new Set((slots?.footer || []).map(f => f?.intentId));
      const toolbarItems = slots?.toolbar || [];
      const newFooterItems = [];
      const toolbarIdsToStrip = new Set();

      for (const intent of intents || []) {
        const intentId = intent?.id;
        if (!intentId) continue;
        if (existingFooterIds.has(intentId)) continue;
        if (!isSingleValueReplaceOnMain(intent, mainEntity)) continue;
        const toolbarItem = toolbarItems.find(t => t?.intentId === intentId);
        // Parameters: предпочитаем inferred-параметры из toolbar-элемента (их
        // уже обработал assignToSlotsDetail через inferParameters + inferControlType).
        // Если intent не попал в toolbar (напр. filtered ownership'ом), берём
        // authored parameters (if any). Рендереру нужны хоть какие-то данные
        // для input'а, иначе inline-setter не разместит контрол.
        const parameters = toolbarItem?.parameters || intent.parameters || [];
        newFooterItems.push({
          intentId,
          label: intent.name,
          conditions: intent.particles?.conditions || [],
          parameters,
        });
        if (toolbarItem) toolbarIdsToStrip.add(intentId);
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
      { domain: "planning", projection: "poll_overview", reason: "set_deadline: 1 replace-effect на poll.deadline" },
      { domain: "invest", projection: "portfolio_detail", reason: "rename_portfolio: 1 replace-effect на portfolio.name" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "listing_detail", reason: "create_listing — α:add, не replace; нет single-field setter intent'а" },
    ],
  },
};
