---
"@intent-driven/renderer": minor
---

`AdminShell` — новый layout-primitive для admin-style enterprise UX
(Keycloak / Gravitino / Argo / Grafana / любой control-plane).
2-column shell с persistent sidebar tree (instance-aware) и body,
переключаемым через `onSelect`. Контраст с `TreeNav`: тот рендерит
schema-иерархию (entity-types) внутри catalog body; `AdminShell` — это
layout-region, дерево с runtime-instance-узлами + params.

API:
```jsx
<AdminShell
  tree={[
    {
      id: "realm:r_master",
      label: "master",
      projectionId: "realm_detail",
      params: { realmId: "r_master" },
      children: [
        { id: "users:r_master", label: "Users", projectionId: "user_list", params: { realmId: "r_master" } },
        ...
      ],
    },
  ]}
  body={<ProjectionRendererV2 projection={current} />}
  onSelect={({ projectionId, params, node }) => navigate(projectionId, params)}
  currentNodeId="users:r_master"
  expanded={["realm:r_master"]}     // controlled, или uncontrolled (опускаем)
  onExpand={(nodeId, isExpanded) => ...}
  sidebarWidth={260}
  sidebarTitle="Workspace"
/>
```

Discovered в Keycloak dogfood-спринте 2026-04-23 (G-K-14): hierarchy-tree-nav
pattern apply'ится только внутри одного catalog body, нет глобального
persistent sidebar. AdminShell закрывает целый класс админ-UI use-case'ов.

10 unit-tests covering layout (aside+main), expansion (controlled +
uncontrolled), instance-aware onSelect, currentNodeId active highlighting,
empty / null edge cases.
