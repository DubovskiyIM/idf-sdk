---
"@intent-driven/core": minor
---

feat(patterns): global-scope-picker — header scope-switcher для multi-tenant/cluster admin

Новый stable pattern (Sprint 1 P0 #7). Promote'ится из rancher-manager-global-scope-picker candidate (argocd-pattern-batch 2026-04-24). Связан с ArgoCD dogfood backlog §10 G-A-1.

**Гипотеза**: Когда 80%+ namespaced projection'ов живут под одним discriminator (tenant/cluster/workspace/realm), sidebar-фильтр требует O(n) кликов при переключении контекста. Header-picker даёт O(1) переключение — глобальный scope применяется ко всем view автоматически.

**Trigger**: ontology содержит ≥1 scope entity (isScope: true | kind: "reference" | naming convention: Tenant/Cluster/Workspace/Realm/Namespace/Project/Environment/Organization) AND ≥3 других entities имеют FK-зависимость (field `<scopeLower>Id` | `references === scopeName` | entityRef с именем содержащим scopeLower). OR: `projection.scope` явно задан.

**Apply**: дополняет `slots.header` полем `scopePicker: { entity, label, source }`. No-op если scopePicker уже задан (author-override) или scope entity не найдена.

**Эталоны**: Rancher Manager (cluster picker), ArgoCD (project filter), Kubernetes Dashboard (namespace picker), Keycloak (realm switcher), Grafana (org switcher).

**Falsification**: shouldMatch: argocd/applications_list (Project kind=reference), keycloak/clients_list (Realm isScope=true). shouldNotMatch: lifequest/dashboard (single-user), planning/my_polls (<3 scoped entities).

21 тест (trigger × 8, structure.apply × 9, helpers × 4). Bump stable count: 39 → 40.

Helpers экспортированы для reuse: `findScopeEntity`, `countScopedEntities`, `humanize`.
