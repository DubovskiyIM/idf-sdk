---
"@intent-driven/renderer": minor
---

feat(renderer): renderAs dispatchers resourceTree + conditionsTimeline

Закрывает §10.4c (ArgoCD G-A-4c). Парный с §10.4a (importer extractInlineArrays, idf-sdk#306) и §10.4b (SubCollectionSection inlineSource, idf-sdk#315). Pipeline для inline-children теперь полный:

```
importer.extractInlineArrays → entity.inlineCollections[]
  → crystallize_v2 (next PR) → section.inlineSource
    → SubCollectionSection inlineSource (#315)
      → renderAs.type === "resourceTree" | "conditionsTimeline" (this PR)
```

## Новый primitive `ResourceTree`

Древовидный inline-list для Kubernetes-style ресурсов (Deployment → ReplicaSet → Pod, Service, ConfigMap, ...). Резолвит depth через:

- `levelField` (если задан, приоритет) — явный уровень в item
- `parentField` — строит граф через `item[parentField] === parent[nameField]`
- иначе flat (level 0)

**Props:**

- `items`, `nameField` (default `"name"`), `kindField` (default `"kind"`)
- `iconMap` — extends `DEFAULT_KIND_ICONS` (Deployment 📦, Pod 🐳, Service 🔌, etc.)
- `badgeColumns: [{ field, colorMap }]` — Tag cells справа от имени
- `onItemClick(item)` — row-click callback

Зарегистрирован в `PRIMITIVES.resourceTree` + named export `ResourceTree`. EventTimeline тоже теперь named-экспорт из `primitives/index.js`.

## EventTimeline `dotColorBy` (snapshot kind)

Расширение для severity-coloring conditions timeline:

```js
dotColorBy: {
  field: "type",
  colorMap: { SyncError: "danger", ResourceHealth: "success" },
  default: "default",
}
```

Маппит value через colorMap → tone → hex (`success #22c55e` / `warning #f59e0b` / `danger #ef4444` / `info #3b82f6` / `neutral #9ca3af` / `default #6366f1`). Также ранее snapshot/causal rows крэшились на items без `id` — теперь синтетический React-key (`snap_${idx}` / `causal_${idx}`).

## SubCollectionSection — два новых dispatcher'а

```js
// K8s status.resources[]
{
  inlineSource: "status.resources",
  renderAs: {
    type: "resourceTree",
    nameField: "name", kindField: "kind",
    parentField: "ownerName",
    badgeColumns: [
      { field: "health", colorMap: { Healthy: "success", Degraded: "danger" } },
      { field: "sync",   colorMap: { Synced:  "success", OutOfSync: "warning" } },
    ],
    intentOnClick: "open_resource",  // ctx.exec(intent, { id: item.id })
  },
}

// K8s status.conditions[] — audit-log timeline
{
  inlineSource: "status.conditions",
  renderAs: {
    type: "conditionsTimeline",
    atField: "lastTransitionTime",      // default
    stateFields: ["type", "status", "message"],  // default
    dotColorBy: {
      field: "type",
      colorMap: { SyncError: "danger", ResourceHealth: "success" },
    },
  },
}
```

## Closes

- backlog §10.4c (ArgoCD G-A-4c, 16-й полевой тест)
- Полностью закрывает inline-children family вместе с §10.4a (#306) + §10.4b (#315)

## Тесты

- 11 новых для `ResourceTree` (flat / kind-icon / iconMap override / parentField graph / levelField priority / badge columns / onItemClick / orphan-cycle / empty / id-less smoke)
- 7 новых для SubCollectionSection dispatchers (inline+resourceTree integration, intentOnClick, empty, conditionsTimeline render, dotColorBy, custom at/stateFields, empty)
- 587/587 green в renderer (+18 от 569)
