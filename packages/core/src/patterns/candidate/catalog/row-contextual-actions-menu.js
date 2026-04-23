/**
 * Row-level contextual actions dropdown (⋯ / ⚙ / "…" trigger) —
 * стандартный CRUD-admin паттерн для коллапса ≥3 per-row intents
 * в dropdown вместо inline-кнопок.
 *
 * Источник: Gravitino v2 WebUI 2026-04-23 dogfood (user observation:
 * "шестерёнка вызывает контекстное меню с действиями, возможными к
 * выполнению для сущности в row"). Field validation:
 *   - AntD Pro ProTable — actionRef с `ellipsis` column
 *   - Stripe Dashboard — ⋯ dropdown на customers / invoices / subs
 *   - GitHub PR/Issues list — ⋯ menu (Pin / Close / Convert / Delete)
 *   - K8s Lens — row-level contextual menu
 *   - Linear issue list — ⋯ menu per row
 *   - Notion database row — ⋯ menu
 *
 * Ключевой UX-принцип: **inline для primary action, menu для
 * вторичных**. Если primary + 2-3 secondary (Edit + Delete + Archive +
 * Duplicate) — первый inline, остальные в dropdown. Это композируется
 * с `catalog-action-cta` (primary action, обычно "Create"/"Run") —
 * row-contextual дополняет, а не заменяет.
 *
 * Pattern matching-only в этом релизе. Promotion в stable после:
 *   - integration с crystallize_v2 autoDetectIntentsForMainEntity
 *     (автосбор applicable intents для row-entity)
 *   - composition с `catalog-action-cta` (primary vs secondary split)
 *   - UX-falsification: feed/dashboard должен NOT match (там per-row
 *     actions — на hover inline, не menu).
 */
export default {
  id: "row-contextual-actions-menu",
  version: 1,
  status: "candidate",
  archetype: "catalog",
  trigger: {
    requires: [
      // ≥3 intents, target которых — mainEntity (applicable per-row).
      // В candidate-trigger не навязываем — stable-версия добавит
      // specific kind:"intent-count-for-entity" ≥ 3.
    ],
  },
  structure: {
    slot: "body",
    description: "В catalog-archetype body (DataGrid или list) — добавить rightmost column 'Actions' (kind:'actions', display:'menu' или 'auto'). Trigger — kebab ⋯ (по умолчанию) или ⚙ gear icon (col.icon='gear') — открывает dropdown со списком applicable intents для row entity (Edit, Duplicate, Archive, Delete, ...). Primary action (если найден через `catalog-action-cta`) остаётся inline; secondary уходят в menu. Dropdown items: label из intent.label/intent id, danger:true для remove/delete/revoke для красного цвета. Click на menu trigger (или item) .stopPropagation — не триггерит row onItemClick. Keyboard: Enter/Space открывает menu, Escape закрывает, Arrow down/up навигирует (native ARIA menuitem). Pattern автоматически выбирает inline vs menu по количеству actions (≤2 inline, ≥3 menu) через col.display='auto'.",
  },
  rationale: {
    hypothesis: "CRUD-admin таблицы с ≥3 per-row actions страдают от визуального шума (2 кнопки × N rows = 2N кнопок в поле зрения). Dropdown схлопывает в 1 trigger per row, освобождая visual bandwidth для data columns. Но первое (primary) действие всё равно должно быть inline для quick-access — иначе пользователь делает 2 клика вместо 1 на hot path. Inline-for-primary + menu-for-secondary — сбалансированный компромисс.",
    evidence: [
      { source: "Apache Gravitino v2 WebUI", description: "Kebab/ellipsis menu per row на всех 12 модулях — edit/delete/grant-role собраны в dropdown", reliability: "high" },
      { source: "AntD Pro ProTable", description: "Дефолтный actionRef API — ellipsis column с Dropdown", reliability: "high" },
      { source: "Stripe Dashboard", description: "Customers/Invoices/Subscriptions lists — ⋯ trigger с context menu", reliability: "high" },
      { source: "GitHub (PR/issues list)", description: "⋯ menu per row: Pin / Close / Convert to draft / Delete", reliability: "high" },
      { source: "Linear / Height / Notion db", description: "⋯ menu на hover — Edit / Duplicate / Archive / Delete", reliability: "high" },
      { source: "K8s Lens / Rancher", description: "Right-click context menu + kebab trigger — Edit YAML / Delete / Scale / Logs", reliability: "high" },
    ],
    counterexample: [
      { source: "image-rich feed (sales.listing_feed)", description: "Cards grid — actions не per-row menu, а на hover прямо в card (heart / watchlist / share). Card layout сам — visual-first", reliability: "high" },
      { source: "messenger conversations_feed", description: "Timeline/list — actions через long-press / swipe / right-click, не visible menu column", reliability: "high" },
      { source: "≤2 actions per row", description: "Не нужен menu — inline кнопки экономят один клик. Pattern на это проверяет через col.display:'auto'", reliability: "high" },
      { source: "dashboard widgets", description: "Не catalog-archetype; actions на widget-level, не на row", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "gravitino", projection: "user_list", reason: "user CRUD: Grant Role + Revoke Role + (future) Edit + Delete — уже 3-4 row actions, menu сжимает" },
      { domain: "gravitino", projection: "role_list", reason: "Role: Edit + Duplicate + Delete + assign-to-users — ≥3 actions per row" },
      { domain: "compliance", projection: "controls_list", reason: "Control: Edit + Attest + Reassign + Deactivate — ≥3 actions" },
      { domain: "sales", projection: "admin_listings", reason: "Admin view listings: Edit + Feature + Suspend + Delete — ≥3 actions для moderators" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "listing_feed", reason: "Image-rich feed для buyer → heart/watchlist inline в card, не menu" },
      { domain: "messenger", projection: "conversations_feed", reason: "Timeline + swipe UX, не menu column" },
      { domain: "invest", projection: "portfolios_root", reason: "Grid-card-layout для KPI; actions на hover в card, не menu" },
      { domain: "gravitino", projection: "metalake_list", reason: "Только 1 action (edit) — inline достаточно, menu overkill (col.display:'auto' не включит)" },
    ],
  },
};
