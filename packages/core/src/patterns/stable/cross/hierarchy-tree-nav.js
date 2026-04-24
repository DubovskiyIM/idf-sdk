export default {
  id: "hierarchy-tree-nav",
  version: 1,
  status: "stable",
  archetype: null,  // cross-archetype — shell-level pattern
  trigger: {
    // G-K-26: requires для self-recursive | explicit hierarchy.
    // Старое sub-entity-exists требовало child с FK на mainEntity, что
    // false-positive matched любой FK-chain (e-commerce/Keycloak/etc).
    requires: [
      { kind: "self-reference-or-explicit", entity: "$mainEntity" },
    ],
    match(intents, ontology, projection) {
      // G-K-26 (post-Keycloak dogfood): trigger ужесточён. FK-chain ≥2
      // уровней — слишком aggressive (Realm→Client→ClientScope,
      // Category→Product→LineItem, etc — все matched, treeNav-mess).
      // Реальная hierarchy = self-reference (parentId на entity)
      // ИЛИ explicit `entity.hierarchy: true` declaration автором.
      if (!ontology?.entities) return false;
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;
      const entity = ontology.entities[mainEntity];
      if (!entity) return false;

      // (1) Explicit author signal
      if (entity.hierarchy === true) return true;

      // (2) Self-reference: поле с references === mainEntity (parentId,
      // managerId, replyToId, и т.п.). Это NESTED-records, реальный tree.
      const fields = typeof entity.fields === "object" && !Array.isArray(entity.fields)
        ? entity.fields : {};
      for (const def of Object.values(fields)) {
        if (def?.references === mainEntity) return true;
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
      const { ontology, mainEntity, projection } = context || {};
      if (!mainEntity || !ontology?.entities) return slots;

      // G-K-26 (post-Keycloak dogfood): apply opt-in only. Pattern может
      // match (witness OK), но НЕ инжектит treeNav в sidebar без
      // author-signal:
      //   - ontology.features.hierarchyTreeNav === true (domain-wide), ИЛИ
      //   - projection.patterns.enabled.includes("hierarchy-tree-nav")
      //     (per-projection)
      // Без этого — apply NO-op (pattern matched, но rendering — opt-in
      // как требует author).
      const featureOptIn = ontology?.features?.hierarchyTreeNav === true;
      const projectionOptIn = Array.isArray(projection?.patterns?.enabled)
        && projection.patterns.enabled.includes("hierarchy-tree-nav");
      if (!featureOptIn && !projectionOptIn) return slots;

      const levels = buildHierarchyLevels(ontology, mainEntity);
      if (levels.length < 1) return slots;

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
    hypothesis: "Hierarchy визуализация уместна для self-recursive структур (folder.parentId, group.parentId, comment.replyToId) или явно declared author'ом hierarchy. Flat FK-chain (Category→Product→LineItem, Realm→Client→Scope) — НЕ hierarchy: каждое child — independent entity, не nested records того же типа.",
    evidence: [
      { source: "gravitino-webui", description: "Tree panel был оправдан только при declared hierarchy=true в metalake_detail authored projection (post-2026-04-24)", reliability: "high" },
      { source: "filesystem browser", description: "folder.parentId references folder — natural recursive tree", reliability: "high" },
      { source: "comment threads (Reddit, HN)", description: "comment.parentId references comment — nested replies", reliability: "high" },
    ],
    counterexample: [
      { source: "e-commerce category-product", description: "Category→Product — это catalog filter, не tree (Product не Category)", reliability: "high" },
      { source: "Keycloak Realm-Client-User", description: "Каждый — independent CRUD entity, не recursive. Was over-matched до G-K-26", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "filesystem", projection: "folder_detail", reason: "Folder.parentId references Folder — true recursive tree" },
      { domain: "groups", projection: "group_detail", reason: "Group.parentId references Group (nested groups)" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "chat_view", reason: "Flat message list, нет hierarchy" },
      { domain: "ecommerce", projection: "category_list", reason: "Category→Product — classification, не hierarchy" },
      { domain: "keycloak", projection: "realm_list", reason: "Realm→Client→Scope — independent CRUD entities, не recursive (G-K-26)" },
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
