/**
 * entity-row-actions — auto-добавляет _actions column в catalog dataGrid
 * когда есть intent'ы modifier'ы (α in {replace, remove}) targeting
 * projection.mainEntity. Renders ✎ Edit / 🗑 Delete row-actions через
 * generic dataGrid actions kind.
 *
 * U-derive Phase 2 (gravitino-driven). Phase 3 host'ы переходят с
 * вручную написанных _actions column'ов на этот pattern: projection
 * declarative, host не пишет CRUD-button glue. Pattern по-прежнему
 * уважает author-override — `_actions` уже в bodyOverride → no-op.
 */

const ALPHA_TO_LABEL = {
  replace: { label: "Edit",   icon: "edit",   danger: false },
  remove:  { label: "Delete", icon: "delete", danger: true  },
};

/**
 * Convention: первый required param ← item.name (gravitino style).
 * Phase 3 расширим до declarative param-mapping в ontology.
 */
function deriveParamsTemplate(intent) {
  const out = {};
  for (const [pname, def] of Object.entries(intent.parameters || {})) {
    if (def.required) out[pname] = "item.name";
  }
  return out;
}

export const PATTERN = {
  id: "entity-row-actions",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "intent-effect", α: "replace" },
    ],
    match(intents, ontology, projection) {
      const entity = projection?.mainEntity;
      if (!entity) return false;
      // Catalog должен иметь хотя бы один modifier intent на mainEntity.
      const list = Array.isArray(intents) ? intents : Object.values(intents || {});
      return list.some(i =>
        (i?.target === entity || i?.particles?.effects?.some(e => e.target === entity)) &&
        (i?.alpha === "replace" || i?.alpha === "remove" ||
         i?.particles?.effects?.some(e => e.α === "replace" || e.α === "remove")),
      );
    },
  },
  structure: {
    slot: "body",
    description:
      "В catalog dataGrid добавляет column { key: '_actions', kind: 'actions' } " +
      "со списком actions, выведенным из modifier-intent'ов (replace → Edit, " +
      "remove → Delete). Author-override через _actions column в bodyOverride сохраняется.",
    apply(slots, context) {
      if (!slots?.body || slots.body.type !== "dataGrid") return slots;
      if (!Array.isArray(slots.body.columns)) return slots;
      // Author override
      if (slots.body.columns.some(c => c.key === "_actions")) return slots;

      const entity = context?.projection?.mainEntity;
      if (!entity) return slots;
      const intentsRaw = context?.intents || {};
      // Поддерживаем оба формата: Object<id, intent> (host) и Array<intent> (registry-eval).
      const entries = Array.isArray(intentsRaw)
        ? intentsRaw.map(i => [i.id, i])
        : Object.entries(intentsRaw);

      const modifiers = entries
        .filter(([_, i]) =>
          i?.target === entity && (i?.alpha === "replace" || i?.alpha === "remove"),
        )
        .map(([id, i]) => ({ id, intent: i }));
      if (modifiers.length === 0) return slots;

      const actions = modifiers.map(({ id, intent }) => {
        const meta = ALPHA_TO_LABEL[intent.alpha] || { label: id, danger: false };
        return {
          intent: id,
          label: meta.label,
          params: deriveParamsTemplate(intent),
          ...(meta.danger && { danger: true }),
        };
      });

      const newCol = {
        key: "_actions",
        label: "Actions",
        kind: "actions",
        display: "menu",
        icon: "gear",
        menuLabel: `${entity} actions`,
        actions,
      };
      return {
        ...slots,
        body: { ...slots.body, columns: [...slots.body.columns, newCol] },
      };
    },
  },
  rationale: {
    hypothesis:
      "CRUD-admin таблицы получают inline row-actions автоматически из intent " +
      "metadata (α=replace → Edit, α=remove → Delete). Reduces host boilerplate: " +
      "вместо ручного config _actions column'а на каждой проекции — pattern apply " +
      "по declarative ontology.",
    evidence: [
      { source: "Apache Gravitino v2 WebUI", description: "row-actions Edit/Delete на каждой CRUD таблице (metalakes / catalogs / roles / policies)", reliability: "high" },
      { source: "AntD Pro ProTable", description: "Default action-column pattern для admin-CRUD", reliability: "high" },
      { source: "Linear / Jira admin", description: "Inline edit/delete actions per row", reliability: "high" },
    ],
    counterexample: [
      { source: "image-rich feeds (avito/airbnb listings)", description: "grid-card-layout без actions column — actions в overlay", reliability: "high" },
      { source: "monitoring dashboard", description: "Read-only KPI grid без modifier intents", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "gravitino", projection: "metalake_list", reason: "alterMetalake (replace) + dropMetalake (remove) — оба modifier на Metalake" },
      { domain: "gravitino", projection: "role_list",     reason: "alterRole + deleteRole modifier'ы на Role" },
    ],
    shouldNotMatch: [
      { domain: "invest",    projection: "portfolios_root",   reason: "Read-dominant, без replace/remove на Portfolio" },
      { domain: "messenger", projection: "conversations_feed", reason: "Feed shape, нет dataGrid body" },
    ],
  },
};

export default PATTERN;
