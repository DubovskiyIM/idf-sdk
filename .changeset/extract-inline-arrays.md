---
"@intent-driven/importer-openapi": minor
---

feat(importer-openapi): extractInlineArrays — inline array-of-object как child-коллекция

K8s CRD и audit-log API часто содержат inline массивы объектов, которые не выносятся в отдельный top-level schema с path-collection:

- `Application.status.resources[]` (K8s Deployment/Service/Pod список)
- `Application.status.conditions[]` (audit-log: type/status/lastTransitionTime/message)

Стандартный importer мапил их в `{ type: "json" }` и терял структуру items. Host (ArgoCD) вынуждался декларировать синтетические `Resource` / `ApplicationCondition` entities с синтетическим FK на parent.

`extractInlineArrays` ищет такие inline-массивы и аннотирует parent entity:

```js
entity.inlineCollections = [
  {
    fieldName: "resources",
    path: ["status", "resources"],
    itemName: "ResourceStatus",           // из items.$ref, если был
    itemFields: { kind: { type: "string" }, ... },
  },
];
```

Renderer (следующий PR) читает `inlineCollections[]` и рендерит child-коллекцию **без** FK-lookup — items резолвятся прямо из `parent[path[0]][path[1]]`.

**Поведение:**

- Сканирует только raw schemas из `spec.components.schemas` (path-derived stubs пропускаются).
- Resolves `items.$ref` через `flattenSchema` (доступ к spec сохранён).
- `array-of-primitive` игнорируются (только object-items).
- Default `minItemFields: 2` — single-field objects не считаются коллекцией.
- `maxDepth: 3` — хватает для `status.resources[]` и `spec.source.helm.parameters[]`.
- Nested scan по prefixes: `status` / `spec` / `data` / `metadata` (K8s паттерн), top-level всегда.
- Opt-out: `opts.extractInlineArrays: false`.

**Closes:** backlog §10.4a (ArgoCD G-A-4a). Разблокирует renderer inline-children primitive + resourceTree/conditionsTimeline dispatchers (§10.4b+c).

**Тесты:** 11 новых (9 unit + 2 integration). Суммарно 167/167 green в пакете.
