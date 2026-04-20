export default {
  id: "hero-create",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "intent-creates", entity: "$mainEntity" },
    ],
    match(intents, ontology, projection) {
      // heroCreate: intent creates mainEntity + confirmation enter/click в catalog контексте
      return intents.some(i => {
        const creates = i.creates?.replace(/\(.*\)$/, "").trim();
        return creates === projection?.mainEntity &&
          (i.particles?.confirmation === "enter" || i.particles?.confirmation === "click" || i.heroCreate);
      });
    },
  },
  structure: {
    slot: "hero",
    description: "Inline creator mainEntity над списком. UX: ввёл название — Enter. Один hero на catalog.",
    /**
     * Apply: формализует существующую SDK-логику (`assignToSlotsCatalog`
     * уже кладёт heroCreate intent в `slots.hero`). Marks первый
     * heroCreate item с `source: "derived:hero-create"`, renderer
     * может opt-in в pattern-specific styling.
     *
     * Idempotent: source-marker preserving.
     */
    apply(slots, context) {
      const { mainEntity } = context || {};
      if (!mainEntity) return slots;
      const hero = slots?.hero;
      if (!Array.isArray(hero) || hero.length === 0) return slots;

      // Ищем heroCreate-элемент (SDK wraps как { type: "heroCreate" }).
      const idx = hero.findIndex(h => h?.type === "heroCreate");
      if (idx === -1) return slots;
      if (hero[idx].source === "derived:hero-create") return slots;

      const tagged = [...hero];
      tagged[idx] = { ...hero[idx], source: "derived:hero-create" };
      return { ...slots, hero: tagged };
    },
  },
  rationale: {
    hypothesis: "Inline-создание снижает friction vs кнопка+модалка для частых операций",
    evidence: [
      { source: "linear", description: "New issue: inline text field в top of list", reliability: "high" },
      { source: "todoist", description: "Quick add task: inline field at top", reliability: "high" },
    ],
    counterexample: [
      { source: "old-jira", description: "Создание через отдельную страницу-форму", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "invest", projection: "goals_root", reason: "create_goal: heroCreate=true, creates=Goal" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "portfolio_detail", reason: "detail архетип" },
    ],
  },
};
