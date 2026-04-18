/**
 * keyboard-property-popover — Linear-style property sidebar.
 *
 * Когда detail-entity имеет ≥4 scalar/reference полей, доступных к mutation
 * через replace-intent (status, priority, assignee, labels, ...),
 * каждое поле получает single-letter hotkey → inline-popover с fuzzy-search.
 * Сохраняет context detail-view и работает одинаково keyboard + click.
 *
 * Signal: Linear issue detail — канонический пример keyboard-first property editing.
 */
export default {
  id: "keyboard-property-popover",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "intent-count", α: "replace", min: 4 },
      { kind: "intent-confirmation", confirmation: "click" },
    ],
    match(intents, ontology, projection) {
      // Требуем чтобы replace-intents были на mainEntity.* (не на sub-entities)
      const mainEntity = projection?.mainEntity?.toLowerCase();
      if (!mainEntity) return false;
      const propertyReplaces = intents.filter(i => {
        const effects = i.particles?.effects || [];
        return effects.some(e =>
          e.α === "replace" &&
          typeof e.target === "string" &&
          e.target.toLowerCase().startsWith(`${mainEntity}.`)
        );
      });
      return propertyReplaces.length >= 4;
    },
  },
  structure: {
    slot: "sections",
    description:
      "Sidebar с property-rows для каждого replace-intent на mainEntity. Каждый row: single-letter hotkey + " +
      "inline-popover (fuzzy-search options по типу поля — calendar для date, sorted list для status, " +
      "multi-select для labels). Enter apply, Esc cancel.",
  },
  rationale: {
    hypothesis:
      "Когда detail-entity имеет ≥4 scalar/reference свойств с replace-intent, modal-editors создают trip-to-modal " +
      "friction и ломают context. Sidebar+hotkey+inline-popover даёт keyboard-first power-users и click-first casual " +
      "users единый contract — один popover-механизм, доступный двумя путями.",
    evidence: [
      { source: "linear", description: "Issue detail sidebar: S status, P priority, A assign, L labels, E estimate, D due — все hotkey + popover", reliability: "high" },
      { source: "notion", description: "Property panel справа с type-specific pickers", reliability: "medium" },
      { source: "jira", description: "Quick-edit sidebar похожей механики (mouse-first, но structure аналогична)", reliability: "medium" },
    ],
    counterexample: [
      {
        source: "simple-entities",
        description: "Entity с 1-2 scalar полей — popover overkill, inline-edit достаточен",
        reliability: "high",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "invest", projection: "portfolio_detail", reason: "Portfolio имеет ≥4 replace-intents (name/riskProfile/targets/allocations)" },
      { domain: "sales", projection: "listing_detail", reason: "Listing имеет ≥4 property replace-intents (title/price/condition/status)" },
      { domain: "lifequest", projection: "goal_detail", reason: "Goal ≥4 scalar properties с replace (name/sphere/priority/target)" },
    ],
    shouldNotMatch: [
      { domain: "booking", projection: "booking_detail", reason: "Booking имеет только cancel/confirm, не property-edits" },
      { domain: "delivery", projection: "courier_location_detail", reason: "CourierLocation — mirror kind, read-only, нет property-replace" },
    ],
  },
};
