export default {
  id: "m2m-attach-dialog",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      // m2m через assignment/junction entity: entity с 2+ FK полей (sourceId, targetId)
      // ИЛИ role.scope с via (advisor → clients)
      if (!ontology) return false;

      // Путь 1: role.scope с m2m via
      if (ontology.roles) {
        for (const role of Object.values(ontology.roles)) {
          if (role.scope) {
            for (const scopeDef of Object.values(role.scope)) {
              if (scopeDef.via) return true;
            }
          }
        }
      }

      // Путь 2: assignment entity с kind="assignment" в онтологии
      if (ontology.entities) {
        for (const entity of Object.values(ontology.entities)) {
          if (entity.kind === "assignment") return true;
        }
      }

      return false;
    },
  },
  structure: {
    slot: "sections",
    description: "На detail-экране — секция attached items со списком + кнопка Attach, открывающая multi-select dialog из каталога кандидатов.",
  },
  rationale: {
    hypothesis: "M2m-связи требуют выбора из большого множества. Dedicated dialog с multi-select минимизирует навигацию.",
    evidence: [
      { source: "gravitino-webui", description: "Tag/Policy attach на Catalog detail — multi-select dialog", reliability: "high" },
      { source: "github-labels", description: "Labels on issue — multi-select popover", reliability: "high" },
    ],
    counterexample: [
      { source: "messenger-contacts", description: "1:1 — multi-select не нужен", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "invest", projection: "portfolio_detail", reason: "advisor scope через assignments m2m" },
    ],
    shouldNotMatch: [
      { domain: "planning", projection: "poll_overview", reason: "Poll→TimeOption — 1:N composition, не m2m" },
    ],
  },
};
