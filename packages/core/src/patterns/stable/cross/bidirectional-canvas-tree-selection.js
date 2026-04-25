/**
 * Bidirectional canvas↔tree selection — cross-projection state-sharing паттерн.
 *
 * Promoted в stable 2026-04-24 (workflow-editor field-test dogfood) после
 * закрытия трёх promotion-gate'ов:
 *   - Gate 1: trigger.kind `co-selection-group-entity` (schema.js) — PR #303
 *   - Gate 2: renderer `CoSelectionProvider` + `useCoSelection` — PR #308
 *   - Gate 3: adapter capability `interaction.externalSelection` +
 *             `useCoSelectionEnabled` — PR #311
 *
 * Концепт: два peer-projections одного домена читают/пишут shared selection
 * state через `CoSelectionContext`. Tree-side (catalog-archetype + tree-nav)
 * группирует canvas-members по hierarchical buckets (правила, папки,
 * workflow-группы). Canvas-side (canvas-archetype с map/graph) подсвечивает
 * matching nodes + zoom-to-fit. Manual canvas-selection → tree auto-scrolls
 * к owning group.
 *
 * Trigger validates group-entity shape (§16a co-selection):
 *   - `memberField`: массив entity-refs на target (visual members)
 *   - `parentField`: self-reference (иерархия)
 * Оба поля auto-detected или заданы явно.
 *
 * Apply (opt-in только):
 *   Прокидывает `coSelectionTreeNav` node в sidebar при совпадении trigger
 *   и author-signal: `ontology.features.coSelectionTree === true` (domain-
 *   wide) или `projection.patterns.enabled.includes("bidirectional-canvas-
 *   tree-selection")` (per-projection). Без opt-in — no-op (pattern матчится
 *   для witness'а, но UI не изменяется).
 *
 * Idempotent: если `slots.sidebar[0].type === "coSelectionTreeNav"` — no-op.
 *
 * Источник: workflow-editor field-test 2026-04-24 (клиент банка:
 * "tree правил справа + click highlight кубов + zoomTo"). Полевая валидация:
 * Figma layers, n8n workflow zones, Dataiku DSS, Blender hierarchy,
 * React DevTools, VSCode outline, internal workflow-editor field-test.
 */

const DEFAULT_ARRAY_TYPES = new Set(["entityRefArray", "entityRef[]"]);

function isArrayRefField(def) {
  if (!def || typeof def !== "object") return false;
  if (DEFAULT_ARRAY_TYPES.has(def.type)) return true;
  const flagged = def.array === true || def.multi === true || def.many === true;
  const refTarget = def.references || def.entityRef;
  return flagged && typeof refTarget === "string" && refTarget.length > 0;
}

function isSelfRefField(def, entityName) {
  if (!def || typeof def !== "object") return false;
  const refTarget = def.references || def.entityRef;
  return refTarget === entityName;
}

function resolveMemberField(entity, explicitName) {
  const fields = typeof entity?.fields === "object" && !Array.isArray(entity.fields)
    ? entity.fields : {};
  if (explicitName) {
    if (fields[explicitName] && isArrayRefField(fields[explicitName])) {
      return { name: explicitName, def: fields[explicitName] };
    }
    return null;
  }
  for (const [name, def] of Object.entries(fields)) {
    if (isArrayRefField(def)) return { name, def };
  }
  return null;
}

function resolveParentField(entity, entityName, explicitName) {
  const fields = typeof entity?.fields === "object" && !Array.isArray(entity.fields)
    ? entity.fields : {};
  if (explicitName) {
    if (fields[explicitName] && isSelfRefField(fields[explicitName], entityName)) {
      return { name: explicitName, def: fields[explicitName] };
    }
    return null;
  }
  for (const [name, def] of Object.entries(fields)) {
    if (isSelfRefField(def, entityName)) return { name, def };
  }
  return null;
}

function resolveTargetEntity(memberFieldDef) {
  return memberFieldDef?.references || memberFieldDef?.entityRef || null;
}

export default {
  id: "bidirectional-canvas-tree-selection",
  version: 1,
  status: "stable",
  archetype: null,  // cross-archetype — applies regardless of projection.kind
  trigger: {
    requires: [
      { kind: "co-selection-group-entity", entity: "$mainEntity" },
    ],
  },
  structure: {
    slot: "shell",
    description: "Panel справа от canvas — древовидная навигация по group-entity (self-reference parentField). Выбор group-node выставляет shared selection (entityType=target, ids=group.memberField). Canvas-peer подсвечивает matching nodes + zoom-to-fit. Манипуляция canvas-selection синхронизируется обратно в tree через CoSelectionContext.",
    /**
     * Apply: при совпадении trigger + author-signal — prepend
     * `coSelectionTreeNav` node в `slots.sidebar`. Renderer (future
     * primitive) обёртывает в `<CoSelectionProvider>`, внутри — tree-nav
     * с onItemClick → setSelection. Canvas-side не требует apply — peer-
     * компонент использует `useCoSelection` + `useCoSelectionEnabled`
     * напрямую для graceful fallback.
     *
     * Opt-in (как у hierarchy-tree-nav): без signal'а apply — no-op.
     *
     * Output node shape:
     *   {
     *     type: "coSelectionTreeNav",
     *     groupEntity: "<mainEntity>",
     *     parentField: "<selfRefFieldName>",
     *     memberField: "<arrayRefFieldName>",
     *     targetEntity: "<target>",
     *     source: "derived:bidirectional-canvas-tree-selection",
     *   }
     *
     * Idempotent: sidebar[0].type === "coSelectionTreeNav" → no-op.
     */
    apply(slots, context) {
      const { ontology, mainEntity, projection } = context || {};
      if (!mainEntity || !ontology?.entities) return slots;

      const entity = ontology.entities[mainEntity];
      if (!entity) return slots;

      // Opt-in gate (author-signal). Без него apply — no-op.
      const featureOptIn = ontology?.features?.coSelectionTree === true;
      const projectionOptIn = Array.isArray(projection?.patterns?.enabled)
        && projection.patterns.enabled.includes("bidirectional-canvas-tree-selection");
      if (!featureOptIn && !projectionOptIn) return slots;

      // Explicit config может быть задан через projection.patterns.config.
      const config = projection?.patterns?.config?.["bidirectional-canvas-tree-selection"] || {};
      const memberMatch = resolveMemberField(entity, config.memberField);
      if (!memberMatch) return slots;
      const parentMatch = resolveParentField(entity, mainEntity, config.parentField);
      if (!parentMatch) return slots;
      const targetEntity = resolveTargetEntity(memberMatch.def);
      if (!targetEntity) return slots;

      const existing = slots?.sidebar || [];
      if (existing[0]?.type === "coSelectionTreeNav") return slots;

      const treeNode = {
        type: "coSelectionTreeNav",
        groupEntity: mainEntity,
        parentField: parentMatch.name,
        memberField: memberMatch.name,
        targetEntity,
        source: "derived:bidirectional-canvas-tree-selection",
      };
      return {
        ...slots,
        sidebar: [treeNode, ...existing],
      };
    },
  },
  rationale: {
    hypothesis: "Canvas-based редакторы (workflow graphs, flow charts, node-based DCC) быстро превращаются в визуальный хаос при ≥20 нод — пользователь теряет контекст «где я». Иерархическая группировка (группы / папки / зоны) даёт semantic anchor. Но без bidirectional selection tree-панель — just a dead outline: читаешь, не действуешь. Живая связь (tree-click → canvas-highlight+zoom, canvas-select → tree-scroll+highlight) превращает tree из readonly-ToC в primary navigation surface. Figma / n8n / Dataiku / Blender — все сошлись к этому решению независимо.",
    evidence: [
      { source: "Figma / Sketch / Adobe XD", description: "Layers panel ↔ canvas: клик по layer выделяет и zoom-to объект; клик по объекту на canvas подсвечивает его в layers panel. Де-факто стандарт design-tools", reliability: "high" },
      { source: "n8n / Node-RED workflow editors", description: "Workflow / group sidebar ↔ flow canvas — клик по group highlight'ит nodes", reliability: "high" },
      { source: "workflow-editor field-test (2026-04-24)", description: "Клиент банка попросил эту фичу: tree правил + click highlight кубов + zoomTo. В целевом стэке thirdPartyData.gui.groups[].nodeIds + parentGroupId уже существуют — pattern формализует bi-direction через онтологию", reliability: "high" },
      { source: "React DevTools / Redux DevTools", description: "Component tree ↔ runtime viewport/state. Клик по node в tree → highlight в live-app DOM", reliability: "high" },
      { source: "Dataiku DSS flow zones", description: "Zones panel ↔ flow graph (bi-directional selection + zoom-to-fit)", reliability: "high" },
      { source: "VSCode outline + editor", description: "Outline panel ↔ text editor — cursor movement syncs obeh directions", reliability: "medium" },
      { source: "Blender / Maya / Unity hierarchy + viewport", description: "Scene graph panel ↔ 3D viewport. Select object in either → other highlights", reliability: "high" },
    ],
    counterexample: [
      { source: "pure canvas без hierarchical grouping", description: "Простой Miro whiteboard или mermaid diagram — нет entity-level группировки, tree не нужен, pattern не match'ится", reliability: "high" },
      { source: "catalog без canvas-peer", description: "Обычный list view — нет viewport. Здесь нужен обычный hierarchy-tree-nav, не co-selection", reliability: "high" },
      { source: "detail → detail navigation", description: "Inter-entity navigation без viewport (booking_detail → customer_detail) — это routing, не co-selection", reliability: "high" },
      { source: "feed / dashboard", description: "Timeline/KPI surfaces — не canvas-archetype, нет viewport для highlight/zoom", reliability: "high" },
      { source: "canvas с read-only режимом", description: "Static architecture diagram / org chart без manipulation — tree достаточно open-detail без двунаправленной selection", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "workflow", projection: "workflow_editor", reason: "Canvas-archetype граф кубов + Group entity с nodeIds[]+parentGroupId → ожидается tree-панель справа с bidirectional selection (поле-тест 2026-04-24)" },
      { domain: "workflow", projection: "group_tree", reason: "Tree-сторона pair'а: clicking a group → highlight owned nodes в workflow_editor + zoomTo bounds" },
      { domain: "lifequest", projection: "sphere_canvas", reason: "Если есть SphereGroup с goalIds[] hierarchy — tree-sphere ↔ canvas-goal co-selection ожидается" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "listings_feed", reason: "Feed без canvas-peer — простая пагинация, нет viewport для highlight" },
      { domain: "compliance", projection: "controls_list", reason: "Plain catalog без canvas-archetype. hierarchy-tree-nav может применяться, но это НЕ co-selection" },
      { domain: "booking", projection: "booking_detail", reason: "Detail archetype, single entity — нет viewport для co-selection" },
      { domain: "workflow", projection: "node_catalog_readonly", reason: "Readonly каталог доступных операций — нет hierarchy и нет canvas-связи" },
      { domain: "messenger", projection: "conversations_feed", reason: "Feed + detail; нет canvas-archetype, нет hierarchical grouping" },
    ],
  },
};
