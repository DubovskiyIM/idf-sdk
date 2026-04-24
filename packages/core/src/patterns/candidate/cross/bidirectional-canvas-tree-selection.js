/**
 * Bidirectional canvas↔tree selection — co-selection state между
 * canvas-archetype проекцией (граф-редактор, map, flow chart) и
 * catalog-with-hierarchy-tree-nav проекцией, которая группирует элементы
 * canvas по semantic buckets (правила, папки, workflow-группы).
 *
 * Источник: Selfai workflow-editor 2026-04-24 dogfood (user field report:
 * «бизнес хочет видеть правила списком/деревом справа от canvas, клик по
 * правилу → подсветка кубов в graph + zoomTo»). Полевая валидация:
 *   - Figma — layers panel ↔ canvas (клик по layer выделяет объект)
 *   - Sketch / Adobe XD — layer tree + canvas bidirectional
 *   - n8n / Node-RED / Selfai — workflow groups panel + graph canvas
 *   - React DevTools — component tree ↔ highlight in viewport
 *   - Dataiku DSS — flow zones panel ↔ flow graph
 *   - VSCode — outline panel ↔ code editor (cursor sync)
 *   - 3D DCC (Blender / Maya / Unity) — scene hierarchy ↔ viewport
 *
 * Ключевой UX-принцип: **single selection state shared между двумя
 * projections**. Пользователь выбирает group/folder в tree — в canvas
 * подсвечиваются входящие элементы + viewport zoom-to-fit bounds. И
 * наоборот: выделил ноды в canvas → tree auto-scrolls к owning group,
 * highlight'ит её. Без bi-direction → tree становится «мёртвым» readonly
 * оглавлением, не инструментом навигации.
 *
 * Отличие от `hierarchy-tree-nav` (stable): tree-nav работает standalone,
 * open detail on click. Здесь требуется **second projection (canvas)** с
 * general-purpose viewport и **shared selection state между projections**.
 * Это первый формализованный cross-projection state-sharing паттерн.
 *
 * Gap от existing bank: ни один stable pattern не выражает shared runtime
 * state (`__ui.selection`) между двумя projections одного домена.
 * Композируется с `hierarchy-tree-nav` на tree-стороне и с map-primitive
 * или canvas-archetype на viewport-стороне.
 *
 * Pattern matching-only в этом релизе. Promotion в stable после:
 *   - schema.js: новый trigger.kind `"co-selection-group-entity"` —
 *     проверяет наличие group-entity с `nodeIds: entityRef[]` + relation:
 *     «many» к entity, используемой в canvas projection;
 *   - renderer primitive contract: `__ui.selection.nodeIds[]` + событие
 *     `onSelectionChange` как shared state между projections (возможно,
 *     через projection-level context provider);
 *   - adapter capability: canvas-adapter должен декларировать
 *     `supportsExternalSelection` для graceful fallback;
 *   - falsification: одиночный canvas без tree-side должен NOT match
 *     (не хватает hierarchical grouping); tree без canvas-peer — тоже
 *     NOT match.
 */
export default {
  id: "bidirectional-canvas-tree-selection",
  version: 1,
  status: "candidate",
  archetype: "cross",
  trigger: {
    // Candidate — empty requires[], trigger уточняется при promotion.
    // Planned stable-trigger:
    //   1. Есть entity с `nodeIds: { entityRef: <target>, relation: "m2m" }`
    //      + self-ref `parentGroupId` (hierarchy).
    //   2. Есть projection с archetype:"canvas" для <target>-entity.
    //   3. Есть projection с archetype:"catalog" + hierarchy-tree-nav match
    //      для group-entity.
    // Нужен новый trigger.kind `co-selection-group-entity` в schema.js.
    requires: [],
  },
  structure: {
    slot: "cross-projection",
    description: "Two projections share a runtime selection state (`__ui.selection.nodeIds: ID[]`). Tree-side (catalog + hierarchy-tree-nav): onItemClick на group-node → set selection = group.nodeIds; active group подсвечивается в дереве. Canvas-side (canvas archetype): (a) subscribe к `__ui.selection` — подсвечивает matching nodes (border/highlight layer), (b) zoomToFit bounds выделенных nodes, (c) на manual user-selection в canvas (lasso / click) — обновить `__ui.selection`, tree auto-scrolls к owning group и highlight'ит её. Keyboard: Escape → clear selection. Selection кликом по пустому canvas-area → clear. Multi-select через Shift-click в tree (union of groups). Bridge'ед через projection-level context provider или shared runtime state slice (не через URL — ephemeral). Adapter capability check: если canvas-adapter не поддерживает external selection — graceful fallback на одностороннее tree→canvas (readonly highlight, без back-propagation).",
  },
  rationale: {
    hypothesis: "Canvas-based редакторы (workflow graphs, flow charts, node-based DCC) быстро превращаются в визуальный хаос при ≥20 нод — пользователь теряет контекст «где я». Иерархическая группировка (группы / папки / зоны) даёт semantic anchor. Но без bidirectional selection tree-панель — just a dead outline: читаешь, не действуешь. Живая связь (tree-click → canvas-highlight+zoom, canvas-select → tree-scroll+highlight) превращает tree из readonly-ToC в primary navigation surface. Figma / n8n / Dataiku / Blender — все сошлись к этому решению независимо.",
    evidence: [
      { source: "Figma / Sketch / Adobe XD", description: "Layers panel ↔ canvas: клик по layer в панели выделяет и zoom-to объект на canvas; клик по объекту на canvas подсвечивает его в layers panel. Де-факто стандарт design-tools", reliability: "high" },
      { source: "n8n / Node-RED workflow editors", description: "Workflow / group sidebar ↔ flow canvas — клик по group highlight'ит nodes", reliability: "high" },
      { source: "Selfai workflow editor (2026-04-24)", description: "Клиент банка попросил ровно эту фичу: tree правил справа + click highlight кубов в canvas + zoomTo. Оценка 2-6 часов, т.к. `thirdPartyData.gui.groups[].nodeIds` + `parentGroupId` уже существуют в модели данных", reliability: "high" },
      { source: "React DevTools / Redux DevTools", description: "Component tree ↔ runtime viewport/state. Клик по node в tree → highlight в live-app DOM", reliability: "high" },
      { source: "Dataiku DSS flow zones", description: "Zones panel ↔ flow graph (bi-directional selection + zoom-to-fit)", reliability: "high" },
      { source: "VSCode outline + editor", description: "Outline panel ↔ text editor — cursor movement syncs obeh directions", reliability: "medium" },
      { source: "Blender / Maya / Unity hierarchy + viewport", description: "Scene graph panel ↔ 3D viewport. Select object in either → other highlights", reliability: "high" },
    ],
    counterexample: [
      { source: "pure canvas без hierarchical grouping", description: "Простой Miro whiteboard или mermaid diagram — нет entity-level группировки, tree не нужен, pattern не match'ится", reliability: "high" },
      { source: "catalog без canvas-peer", description: "Обычный list view (sales_listings, user_directory) — нет viewport. Здесь нужен обычный `hierarchy-tree-nav`, не co-selection", reliability: "high" },
      { source: "detail → detail navigation", description: "Inter-entity navigation без viewport (booking_detail → customer_detail) — это routing, не co-selection", reliability: "high" },
      { source: "feed / dashboard", description: "Timeline/KPI surfaces — не canvas-archetype, нет viewport для highlight/zoom", reliability: "high" },
      { source: "canvas с read-only режимом", description: "Static architecture diagram / org chart без manipulation — tree достаточно open-detail без двунаправленной selection", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "workflow", projection: "workflow_editor", reason: "Canvas-archetype граф кубов + Group entity с nodeIds[]+parentGroupId → ожидается tree-панель справа с bidirectional selection (поле-тест Selfai 2026-04-24)" },
      { domain: "workflow", projection: "group_tree", reason: "Tree-сторона pair'а: clicking a group → highlight owned nodes в workflow_editor + zoomTo bounds" },
      { domain: "lifequest", projection: "sphere_canvas", reason: "Если есть SphereGroup с goalIds[] hierarchy — tree-sphere ↔ canvas-goal co-selection ожидается" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "listings_feed", reason: "Feed без canvas-peer — простая пагинация, нет viewport для highlight" },
      { domain: "compliance", projection: "controls_list", reason: "Plain catalog без canvas-archetype. `hierarchy-tree-nav` может применяться, но это НЕ co-selection" },
      { domain: "booking", projection: "booking_detail", reason: "Detail archetype, single entity — нет viewport для co-selection" },
      { domain: "workflow", projection: "node_catalog_readonly", reason: "Readonly каталог доступных операций (Read DataFrame, Filter Columns) — нет hierarchy и нет canvas-связи; обычный feed/catalog" },
      { domain: "messenger", projection: "conversations_feed", reason: "Feed + detail; нет canvas-archetype, нет hierarchical grouping" },
    ],
  },
};
