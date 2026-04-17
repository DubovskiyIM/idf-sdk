export default {
  id: "hierarchy-tree-nav",
  version: 1,
  status: "stable",
  archetype: null,  // cross-archetype — shell-level pattern
  trigger: {
    requires: [
      { kind: "sub-entity-exists", foreignKeyTo: "$mainEntity" },
    ],
    match(intents, ontology, projection) {
      // Deep hierarchy: mainEntity → child → grandchild (≥3 levels of FK chain)
      if (!ontology?.entities) return false;
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;

      // Ищем child entities с FK на mainEntity
      const children = findChildEntities(ontology, mainEntity);
      if (children.length === 0) return false;

      // Ищем grandchild entities с FK на child
      for (const child of children) {
        const grandchildren = findChildEntities(ontology, child);
        if (grandchildren.length > 0) return true;
      }
      return false;
    },
  },
  structure: {
    slot: "shell",
    description: "Левая панель — древовидная навигация по цепочке foreignKey (entity → child → grandchild). Выбор узла открывает detail справа.",
  },
  rationale: {
    hypothesis: "Когда сущности формируют цепочку владения ≥3 уровней, flat navigation теряет контекст пути. Tree визуализирует иерархию.",
    evidence: [
      { source: "gravitino-webui", description: "Metalake → Catalog → Schema → Table — 4 уровня, left tree panel", reliability: "high" },
      { source: "aws-console", description: "IAM / S3 / Glue — hierarchical resource browser", reliability: "high" },
    ],
    counterexample: [
      { source: "twitter", description: "Flat feed — tree бессмысленна", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "workflow", projection: "workflow_detail", reason: "Workflow → Node → NodeResult — 3 levels" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "chat_view", reason: "Flat message list, нет deep hierarchy" },
    ],
  },
};

function findChildEntities(ontology, parentName) {
  const fkName = parentName.toLowerCase() + "Id";
  const children = [];
  for (const [name, entity] of Object.entries(ontology.entities)) {
    if (name === parentName) continue;
    const fields = typeof entity.fields === "object" && !Array.isArray(entity.fields) ? entity.fields : {};
    if (fkName in fields) children.push(name);
  }
  return children;
}
