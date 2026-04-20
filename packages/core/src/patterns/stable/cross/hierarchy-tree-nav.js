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
    /**
     * Apply: обходит ontology по цепочке FK от mainEntity (BFS),
     * строит tree metadata { root, levels } и prepend'ит treeNav-node
     * в `slots.sidebar`. Renderer (TreeNav primitive) рендерит вложенные
     * списки entities; runtime items подтягиваются через ctx.world.
     *
     * levels = [{ depth, entity, children: [entityName...] }, ...]
     *
     * Idempotent: если `slots.sidebar[0].type === "treeNav"` — no-op.
     */
    apply(slots, context) {
      const { ontology, mainEntity } = context || {};
      if (!mainEntity || !ontology?.entities) return slots;

      const levels = buildHierarchyLevels(ontology, mainEntity);
      // Минимум 2 уровня (parent → child) — trigger уже проверил 3+,
      // но apply делает defensive check на случай вызова напрямую.
      if (levels.length < 2) return slots;

      const existing = slots?.sidebar || [];
      if (existing[0]?.type === "treeNav") return slots;

      const treeNode = {
        type: "treeNav",
        root: mainEntity,
        levels,
        source: "derived:hierarchy-tree-nav",
      };
      return {
        ...slots,
        sidebar: [treeNode, ...existing],
      };
    },
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

/**
 * BFS по цепочке FK — строит массив уровней { depth, entity, children }.
 * Ограничение глубины: 5 уровней (защита от циклов и избыточной навигации).
 */
function buildHierarchyLevels(ontology, rootEntity) {
  const levels = [];
  const seen = new Set();
  let currentFrontier = [rootEntity];
  let depth = 0;
  const MAX_DEPTH = 5;

  while (currentFrontier.length > 0 && depth < MAX_DEPTH) {
    const nextFrontier = [];
    for (const entity of currentFrontier) {
      if (seen.has(entity)) continue;
      seen.add(entity);
      const children = findChildEntities(ontology, entity).filter(c => !seen.has(c));
      levels.push({ depth, entity, children });
      nextFrontier.push(...children);
    }
    currentFrontier = nextFrontier;
    depth += 1;
  }
  return levels;
}
