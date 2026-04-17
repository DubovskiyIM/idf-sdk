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
