/**
 * CRUD-admin catalog'и по умолчанию рендерятся как tabular DataGrid
 * (AntD Table) — не как grid карточек.
 *
 * Источник: Gravitino v2 WebUI dogfood (2026-04-23), Apache Airflow,
 * AntD Pro admin layouts, Stripe dashboard resources (customers / invoices /
 * subscriptions), K8s dashboards. Во всех этих доменах metalakes / catalogs /
 * users / roles / policies — это CRUD-administration surface; карточный
 * layout подходит для image-rich feeds (listings / posts / listings), а
 * не для scanning-focused admin UI, где нужен sort / filter per column.
 *
 * Примечание. Pattern matching-only в текущей версии — apply deferred.
 * Стратегия stabilization: вместе с pattern-apply ввести в crystallize_v2
 * поддержку synthesized bodyOverride, чтобы pattern мог заменять slots.body
 * на dataGrid primitive без ломания author-override'ов (projection.bodyOverride
 * остаётся выше pattern-apply).
 */
export default {
  id: "catalog-default-datagrid",
  version: 1,
  status: "candidate",
  archetype: "catalog",
  trigger: {
    requires: [
      // Archetype уже catalog — triggerKind достаточно общий, проверок на
      // image/heroImage нет здесь (кандидат anti-matches с grid-card-layout
      // по архитектурно-аморфному правилу: apply order даёт grid-card-layout
      // приоритет, если его trigger сработал; иначе — наш candidate).
    ],
  },
  structure: {
    slot: "body",
    description: "Rendering strategy: заменить slots.body на { type: 'dataGrid', source: pluralizeLower(mainEntity), columns: <witnesses as sortable/filterable columns>, onItemClick: <navigate to detail> }. Каждый witness с `type === 'string'` или `enum` становится filterable column; `boolean/number` — sortable; witness + fieldRole:heroImage / image / multiImage — skip (не pattern'ится). Для enum-полей автоматически добавляется filter:'enum' + values из field.values. Action-column добавляется, если в intent-каталоге есть inline-action intents (pattern composes с `catalog-action-cta`).",
  },
  rationale: {
    hypothesis: "В CRUD-admin surface (metalake / catalog / role / policy / invoice / subscription) пользователю нужен tabular scanning, per-column sort/filter и high information density — card-layout скрывает это за визуальной декорацией. Card-layout уместен для visually-rich feeds (image-catalog listings, social posts). Дефолт для catalog-archetype без image/heroImage signals — table, не cards.",
    evidence: [
      { source: "Apache Gravitino v2 WebUI", description: "All 12 CRUD modules (metalakes, catalogs, schemas, tables, filesets, topics, models, users, groups, roles, tags, policies) — native AntD Table со sort/filter per column", reliability: "high" },
      { source: "Stripe Dashboard", description: "Customers / invoices / subscriptions / balance transactions — DataGrid-style tabular UI с per-column sort+filter", reliability: "high" },
      { source: "AntD Pro", description: "ProTable — дефолт для enterprise CRUD", reliability: "high" },
      { source: "K8s Lens / Rancher", description: "pods / deployments / services — tabular DataGrid с column filters", reliability: "high" },
      { source: "Linear / Jira admin", description: "projects / teams / roles — tabular; card-layout — для work items (user-facing), не для admin", reliability: "high" },
    ],
    counterexample: [
      { source: "avito / profi / airbnb listings", description: "Image-rich feeds → grid-card-layout уместен (heroImage, price, rating)", reliability: "high" },
      { source: "invest portfolios", description: "≥3 money/percentage/trend metrics → grid-card-layout (KPI cards)", reliability: "high" },
      { source: "messenger conversations feed", description: "timeline shape + avatar → cards / list, не DataGrid", reliability: "high" },
      { source: "reflect mood entries", description: "temporal feed + chips → timeline shape, не tabular", reliability: "high" },
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
      { domain: "messenger", projection: "conversations_feed", reason: "timeline shape (date-witness, avatar) → list, не DataGrid" },
    ],
  },
};
