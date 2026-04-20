---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

feat(patterns): `hierarchy-tree-nav.apply` + TreeNav primitive.

## core

Pattern apply обходит ontology по FK-цепочке от `mainEntity` (BFS, depth-limit 5), строит tree metadata и prepend'ит `treeNav`-node в `slots.sidebar`:

```js
sidebar: [
  {
    type: "treeNav",
    root: "Metalake",
    levels: [
      { depth: 0, entity: "Metalake", children: ["Catalog"] },
      { depth: 1, entity: "Catalog",  children: ["Schema"] },
      { depth: 2, entity: "Schema",   children: ["Table"] },
      { depth: 3, entity: "Table",    children: [] },
    ],
    source: "derived:hierarchy-tree-nav",
  },
  // ...existing sidebar nodes
]
```

Trigger (pattern spec): ≥3 уровня FK-цепочки (`mainEntity` → child → grandchild). Apply делает defensive-check — требует минимум 2 уровня.

**Idempotent**: если `sidebar[0].type === "treeNav"` — no-op.

## renderer

Новый primitive `TreeNav` (зарегистрирован в `PRIMITIVES.treeNav`):

- Вертикальный список entities с `paddingLeft: depth * 14px` (визуальная иерархия).
- Heading «Иерархия» + entity labels + counter для children.
- Click по узлу → `ctx.navigate(<entity>_list, {entity})` с fallback на `<entity>_detail`.
- Accessibility: `<nav aria-label="Hierarchy">` + `<button role="tab">`.

Пока что: schema-preview (рендерит структуру, не runtime instances). Полноценная tree-навигация с expand/collapse по instances — future primitive.

## Тесты

- `hierarchy-tree-nav.test.js` — **7 тестов** (BFS chain, idempotency, depth limit, witness).
- `TreeNav.test.jsx` — **7 тестов** (render, padding, counter, navigation, aria).
- **1026 core / 265 renderer** passing.

## Roadmap progress

Было 11 → **10** оставшихся stable patterns без apply (6/16 за 4 PR).
