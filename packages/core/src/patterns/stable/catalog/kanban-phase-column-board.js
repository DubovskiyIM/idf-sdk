/**
 * kanban-phase-column-board — catalog-версия phase-aware-primary-cta.
 *
 * Когда mainEntity имеет status-field с ≥3 enum values и есть replace-
 * intents на .status — пространственная организация колонок кодирует
 * workflow напрямую: позиция карточки = её фаза.
 *
 * Apply: body.layout = { type: "kanban", columnField: "status", columns: [...] }.
 * Drag between columns активирует status-replace intent.
 *
 * Signal: Height kanban, Notion board-view. Upgrade существующего
 * phase-aware-primary-cta (detail) на catalog-уровень.
 */
export default {
  id: "kanban-phase-column-board",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "entity-field", field: "status", minOptions: 3 },
      { kind: "intent-effect", α: "replace", targetSuffix: ".status" },
    ],
  },
  structure: {
    slot: "body",
    description:
      "body.layout={type:'kanban', columnField:'status'}. Каждая status-enum = колонка. Карточки группируются " +
      "визуально. Drag между колонками = replace на status. Composer добавляется в первую колонку (backlog/new).",
    /**
     * Apply: устанавливает `body.layout = { type: "kanban", columnField,
     * columns: [...] }` из enum-options status-поля entity. Renderer
     * (containers/List) детектит kanban-layout и группирует items.
     *
     * Author-override: существующий `body.layout` не перезаписывается.
     * Drag-to-replace — renderer-responsibility (читает replace-intents
     * на `.status`).
     */
    apply(slots, context) {
      const { ontology, mainEntity } = context || {};
      if (!mainEntity || !ontology?.entities) return slots;
      const entity = ontology.entities[mainEntity];
      if (!entity) return slots;

      const statusField = entity.fields?.status;
      const statusOptions = entity.statuses
        || (statusField && Array.isArray(statusField.options) ? statusField.options : null);
      if (!Array.isArray(statusOptions) || statusOptions.length < 3) return slots;

      const body = slots?.body;
      if (!body || typeof body !== "object") return slots;

      // Author-override: явный body.layout (строка или объект) → skip.
      if (body.layout !== undefined && body.layout !== null) return slots;

      const columns = statusOptions.map(opt => {
        if (typeof opt === "string") return { id: opt, label: opt };
        return { id: opt.value ?? opt.id, label: opt.label ?? opt.value ?? opt.id };
      });

      return {
        ...slots,
        body: {
          ...body,
          layout: {
            type: "kanban",
            columnField: "status",
            columns,
            source: "derived:kanban-phase-column-board",
          },
        },
      };
    },
  },
  rationale: {
    hypothesis:
      "Когда entity живёт на state-machine с одним dominant status-полем и главное намерение — двигать по фазам, " +
      "пространственное расположение колонок делает workflow визуально считываемым: количество items per фаза, " +
      "стагнации, общий баланс. Устраняет необходимость открывать detail для смены статуса (drag >> modal).",
    evidence: [
      { source: "height", description: "Kanban columns = workflow phases; drag-drop = replace task.status", reliability: "high" },
      { source: "notion", description: "Board view группирует entries по select-property; drag-between = write", reliability: "high" },
      { source: "jira", description: "Canonical kanban: backlog → in-progress → review → done", reliability: "high" },
    ],
    counterexample: [
      {
        source: "binary-status",
        description: "Entity с status в {on, off} — kanban с 2 колонками хуже toggle-list",
        reliability: "medium",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "workflow", projection: "execution_log", reason: "Execution.status ≥3 values (queued/running/completed/failed) + replace" },
      { domain: "sales", projection: "listing_feed", reason: "Listing.status ≥3 (draft/active/sold/archived) + transition intents" },
      { domain: "delivery", projection: "orders_feed", reason: "Order.status 7+ phases + status-replace intents" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "watchlists_root", reason: "Watchlist не имеет status с enum-фазами" },
    ],
  },
};
