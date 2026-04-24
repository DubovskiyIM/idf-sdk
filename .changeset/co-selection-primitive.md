---
"@intent-driven/renderer": minor
---

feat(renderer): `CoSelectionProvider` + `useCoSelection` — shared selection state

Новый cross-cutting primitive для cross-projection co-selection паттернов
(`bidirectional-canvas-tree-selection` и др.). Второй из трёх promotion-gate'ов
для candidate-паттерна.

API:

```jsx
<CoSelectionProvider initial={{ entityType, ids }} onChange={handler}>
  <TreePeer />    {/* пишет selection клику по group */}
  <CanvasPeer />  {/* читает → highlight + zoomTo */}
</CoSelectionProvider>
```

Hooks:
- `useCoSelection() → { selection, setSelection, toggleSelection, clearSelection, isSelected }`
- `useCoSelectionActive()` — определяет, смонтирован ли провайдер (для adapter'ов
  с `supportsExternalSelection` capability)

Shape `selection`: `null | { entityType: string, ids: string[] }`. Нормализация:
numeric id → string, дубликаты убираются, пустой ids → null, смена entityType
в `toggleSelection` — reset + single.

**Graceful fallback:** вне провайдера `useCoSelection()` возвращает no-op версию
(`isActive === false`) — peer-компоненты безопасно вызывают hook без обязательного
оборачивания.

26 новых тестов в `coSelection.test.jsx`: basic state, normalization
(дубликаты/numeric/null/invalid), toggleSelection (add/remove/reset-on-entityType-change),
isSelected, onChange side-effect, graceful no-op вне провайдера, two-peer синхронизация.

551/551 renderer tests зелёные.
