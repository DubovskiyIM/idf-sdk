---
"@intent-driven/core": patch
---

Pattern bank: новый curated candidate `catalog-default-datagrid`.

**Observation (Gravitino dogfood 2026-04-23):** catalog-archetype без image/multiImage и без ≥3 money/percentage/trend metrics по умолчанию рендерится как grid карточек (legacy fallback), хотя в admin/CRUD surface (metalakes / roles / policies / users / customers / invoices) пользователь ожидает tabular DataGrid с per-column sort/filter. Field research подтверждает: Gravitino v2 WebUI, Stripe Dashboard, AntD Pro, K8s Lens/Rancher, Linear admin — все дефолтят на табличный layout в CRUD-админке.

**Complements** `grid-card-layout` (visual-rich feeds): apply order между двумя паттернами даст grid-card-layout приоритет когда срабатывает его trigger, иначе — catalog-default-datagrid.

**Matching-only в этом релизе** — `structure.apply` deferred. Перед promotion в stable:
1. Интеграция с crystallize_v2 synthesized bodyOverride (pattern должен заменять slots.body на `type: "dataGrid"` без ломания author-override через `projection.bodyOverride`)
2. Composition с `catalog-action-cta` (если в intent-каталоге есть inline actions — добавлять action-column)
3. Falsification batch против invest/sales/messenger/reflect (shouldNotMatch) + gravitino/compliance/Stripe-like domains (shouldMatch)

**Tests:** 6 curated candidates (+1 к существующим 5), все проходят validatePattern + registry-integration.
