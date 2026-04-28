---
"@intent-driven/renderer": minor
---

feat(renderer): pixels reader gap policy observability в ProjectionRendererV2

Reader integrations Step 2 — закрывает «contract orphan» от Phase 4/5 для pixels reader'а. Renderer теперь декларирует свою gap policy и сообщает наблюдённый canonical gap-set через callback, готовый к подаче в `detectReaderEquivalenceDrift`.

**Новые опциональные props в `ProjectionRendererV2`:**

| Prop | Тип | Что |
|---|---|---|
| `ontology` | `Ontology` | Для computation gap-set'а; без неё gap detection пропускается |
| `gapPolicy` | `ReaderGapPolicy` | Override; default = `getReaderPolicy("pixels")` |
| `onGapsObserved` | `(observation) => void` | Callback с `{ reader: "pixels", policy, gapCells }` |

**Поведение:**

- Computation memoized по `(world, ontology)`.
- Callback вызывается через `useEffect` (не side-effect во время рендера).
- Без `ontology` — `gapCells = []` (не throw).
- Без `onGapsObserved` — computation skipped, никакой работы.

**Применение:**

```jsx
<ProjectionRendererV2
  artifact={artifact}
  world={world}
  ontology={ontology}
  onGapsObserved={({ reader, policy, gapCells }) => {
    // Каждый раз при изменении world/ontology каллбек фaйрится.
    // Накопить observations от pixels + voice + document → подать в detectReaderEquivalenceDrift.
  }}
/>
```

**peerDependency bump:** `@intent-driven/core: >=0.3.0` → `>=0.112.0` (требуется `computeCanonicalGapSet` из Phase 5 + `getReaderPolicy` из Phase 4).

**Backward compat.** Pure extension — все 3 prop'а опциональны. Caller'ы, не использующие их, не замечают изменений.

6 новых integration-тестов в `ProjectionRendererV2.gapPolicy.test.jsx`. Полный renderer suite **596/596** green.
