/**
 * CRUD-admin catalog'и автоматически рендерятся как tabular DataGrid
 * (AntD Table) — не как grid карточек.
 *
 * Промоция из candidate → stable (2026-04-23) после Gravitino dogfood:
 * candidate формулировал observation, apply реализует rendering.
 *
 * Field evidence: Gravitino v2 WebUI, AntD Pro ProTable, Stripe Dashboard,
 * K8s Lens/Rancher, Linear/Jira admin.
 *
 * Apply order: `grid-card-layout` имеет priority (visual-rich signals:
 * image/multiImage или ≥3 metrics). Если его trigger не сработал — наш
 * apply заменяет default list-body на dataGrid primitive с
 * auto-derived columns. Author-override через `projection.bodyOverride`
 * сохраняется — pattern no-op когда `slots.body.type === "dataGrid"`
 * уже установлен (author сам захотел grid).
 *
 * X1-debt: когда 90%+ catalog'ов в репозитории используют dataGrid как
 * default — разрешить автору opt-out через `projection.layout: "cards"`
 * или `projection.shape: "feed"` (уже supported в crystallize_v2).
 */

const SKIP_FIELD_ROLES = new Set(["heroImage", "avatar", "image"]);
const SKIP_FIELD_TYPES = new Set(["image", "multiImage", "json", "richText"]);

/**
 * Выводит column-spec из witness-поля ontology:
 *   - string/text → sortable + filterable (text input)
 *   - enum / field.values → sortable + filter:"enum"
 *   - boolean → sortable + filter:"enum" [true, false]
 *   - number/int/float/money → sortable (no filter по default)
 *   - date/timestamp → sortable
 *   - object/array/image-kinds → skip (pattern'ится отдельными primitives)
 *
 * Возвращает null для skipped fields — caller фильтрует.
 */
function deriveColumn(witness, entity) {
  const field = entity?.fields?.[witness];
  if (!field) {
    // Witness без field-definition — базовый filterable string column
    return { key: witness, label: humanize(witness), sortable: true, filterable: true };
  }
  const type = (field.type || "").toLowerCase();
  const role = field.fieldRole;
  if (SKIP_FIELD_TYPES.has(type)) return null;
  if (role && SKIP_FIELD_ROLES.has(role)) return null;

  const col = { key: witness, label: field.label || humanize(witness), sortable: true };

  if (type === "boolean" || field.values) {
    col.filter = "enum";
    col.values = Array.isArray(field.values)
      ? field.values
      : (type === "boolean" ? [true, false] : []);
  } else if (type === "string" || type === "text" || !type) {
    col.filterable = true;
  } else if (type === "number" || type === "int" || type === "integer" || type === "float" || type === "decimal") {
    // Numeric — sortable, без filterable (textual filter нерелевантен)
  } else if (type === "date" || type === "timestamp" || type === "datetime") {
    col.format = "date";
  } else {
    col.filterable = true;
  }
  return col;
}

function humanize(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
}

function pluralizeLower(entity) {
  if (!entity) return "items";
  const lower = entity.toLowerCase();
  if (lower.endsWith("y")) return lower.slice(0, -1) + "ies";
  if (lower.endsWith("s") || lower.endsWith("x")) return lower + "es";
  return lower + "s";
}

export default {
  id: "catalog-default-datagrid",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [],
    /**
     * Matches: catalog-archetype + mainEntity существует + mainEntity НЕ
     * имеет image/multiImage field (иначе grid-card-layout победит) + НЕ
     * имеет ≥3 money/percentage/trend fields (тоже grid-card).
     *
     * ≥3 witness-полей — нужно для minimal admin-grid (1 column — list,
     * не table). Pattern также требует, чтобы witnesses не были пустыми.
     */
    match(intents, ontology, projection) {
      if (projection?.archetype && projection.archetype !== "catalog") return false;
      const mainEntity = projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity?.fields || typeof entity.fields !== "object") return false;

      // Visual-rich entity → yield to grid-card-layout
      let metricCount = 0;
      let hasImage = false;
      for (const [, def] of Object.entries(entity.fields)) {
        if (def?.type === "image" || def?.type === "multiImage") { hasImage = true; break; }
        if (def?.fieldRole === "money" || def?.fieldRole === "percentage" || def?.fieldRole === "trend") {
          metricCount++;
        }
      }
      if (hasImage || metricCount >= 3) return false;

      // Минимум 2 witness-полей для осмысленной table (иначе просто list)
      const witnesses = Array.isArray(projection?.witnesses) ? projection.witnesses : [];
      return witnesses.length >= 2;
    },
  },
  structure: {
    slot: "body",
    description: "Заменяет slots.body на { type: 'dataGrid', source: pluralizeLower(mainEntity), columns: <auto-derived из witnesses>, onItemClick: <preserved из body> }. Auto-derive по ontology.field: string/text → sortable+filterable, enum/field.values → filter:'enum', boolean → filter:'enum' [true,false], number → sortable, skip image/multiImage/json/richText (pattern'ится primitives). Author-override: projection.bodyOverride сохраняется; slots.body.type === 'dataGrid' (уже authored) → no-op.",
    /**
     * Apply заменяет slots.body на authored dataGrid primitive.
     * Уважает:
     *   - projection.bodyOverride (уже applied в assignToSlotsCatalog)
     *   - body.type === "dataGrid" (author уже задал)
     *   - body.layout === "grid" (grid-card-layout применился)
     */
    apply(slots, context) {
      const { projection, ontology } = context;
      const body = slots?.body;
      if (!body) return slots;
      if (body.type === "dataGrid") return slots; // author / earlier pattern
      if (body.layout === "grid") return slots;    // grid-card-layout
      if (projection?.bodyOverride) return slots;   // author-override preserved

      // G-K-22: preferDataGrid switch override'ит avoid-trespass guard.
      // Default — оставляем list+actions (catalog-action-cta wins).
      // Если ontology.features.preferDataGrid: true — синтезируем DataGrid
      // с actions-column из item.intents (admin-CRUD use case).
      const preferDataGrid = ontology?.features?.preferDataGrid === true;
      const itemIntents = Array.isArray(body.item?.intents) ? body.item.intents : [];
      if (itemIntents.length > 0 && !preferDataGrid) return slots;

      const mainEntity = projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity) return slots;

      const witnesses = Array.isArray(projection?.witnesses) ? projection.witnesses : [];
      const columns = witnesses
        .map(w => deriveColumn(w, entity))
        .filter(Boolean);
      if (columns.length === 0) return slots;

      // G-K-22: actions-column из item.intents — конвертация format'ов.
      // catalog-action-cta использует {intentId, opens, overlayKey, icon};
      // ActionCell expect {intent, label, params, danger}. ActionCell
      // auto-detect form-confirmation (G-K-24) → openOverlay сама.
      if (itemIntents.length > 0) {
        const labelFor = (id) => id.startsWith("update") ? "Изменить"
          : id.startsWith("remove") ? "Удалить"
          : id.startsWith("read")   ? "Открыть"
          : id;
        columns.push({
          key: "_actions",
          kind: "actions",
          label: "",
          display: "auto",
          actions: itemIntents.map(it => ({
            intent: it.intentId,
            label: it.label || labelFor(it.intentId),
            params: { id: "item.id" },
            danger: it.intentId.startsWith("remove"),
            // Propagate buildItemConditions (precondition + ownership + phase).
            // Без этого pay_order остаётся в меню заказа со status='paid' —
            // ActionCell фильтрует по conditions только если они переданы.
            ...(Array.isArray(it.conditions) && it.conditions.length > 0
              ? { conditions: it.conditions }
              : {}),
            ...(it.opens === "overlay" ? { opens: "overlay", overlayKey: it.overlayKey } : {}),
          })),
        });
      }

      const newBody = {
        type: "dataGrid",
        items: [],
        source: pluralizeLower(mainEntity),
        columns,
        emptyLabel: `Нет данных (${projection?.name || mainEntity})`,
      };
      if (body.onItemClick) newBody.onItemClick = body.onItemClick;

      return { ...slots, body: newBody };
    },
  },
  rationale: {
    hypothesis: "В CRUD-admin surface (metalake/catalog/role/policy/invoice/subscription) пользователю нужен tabular scanning, per-column sort/filter и высокая information density. Card-layout уместен для visually-rich feeds (image-catalog listings, social posts). Дефолт для catalog-archetype без image/heroImage signals и без ≥3 metrics — table, не cards.",
    evidence: [
      { source: "Apache Gravitino v2 WebUI", description: "All 12 CRUD modules — native AntD Table со sort/filter per column", reliability: "high" },
      { source: "Stripe Dashboard", description: "Customers/invoices/subscriptions/balance — DataGrid-style tabular UI", reliability: "high" },
      { source: "AntD Pro ProTable", description: "Дефолт для enterprise CRUD", reliability: "high" },
      { source: "K8s Lens / Rancher", description: "pods/deployments/services — tabular DataGrid", reliability: "high" },
      { source: "Linear / Jira admin", description: "Projects/teams/roles — tabular", reliability: "high" },
    ],
    counterexample: [
      { source: "avito/profi/airbnb listings", description: "Image-rich feeds → grid-card-layout (heroImage, price, rating)", reliability: "high" },
      { source: "invest portfolios", description: "≥3 money/percentage/trend → grid-card-layout (KPI cards)", reliability: "high" },
      { source: "messenger conversations feed", description: "timeline shape + avatar → list", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "gravitino", projection: "metalake_list", reason: "admin CRUD: ни image, ни KPI metrics — name+comment+properties, чистый tabular use-case" },
      { domain: "gravitino", projection: "role_list", reason: "Role без visual signals; sort/filter per name уместен" },
      { domain: "gravitino", projection: "policy_list", reason: "Policy admin: type+enabled — классический enum-filter scan" },
      { domain: "compliance", projection: "controls_list", reason: "SOX controls: status + owner + cycle — tabular для auditor scanning" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "portfolios_root", reason: "Portfolio: money(totalValue) + money(pnl) + percentage(targetStocks) = 3 metrics → grid-card-layout" },
      { domain: "sales", projection: "listing_feed", reason: "Listing: multiImage + price — image-rich feed → grid-card-layout" },
      { domain: "messenger", projection: "conversations_feed", reason: "timeline shape → list, не DataGrid" },
    ],
  },
  // Helpers exported для тестов и reuse
  _helpers: { deriveColumn, humanize, pluralizeLower },
};
