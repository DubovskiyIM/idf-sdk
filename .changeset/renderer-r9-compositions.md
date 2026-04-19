---
"@intent-driven/renderer": minor
---

feat(renderer): R9 end-to-end — List и ArchetypeDetail auto-enrich items через compositions

Renderer теперь auto-обогащает items alias-полями из `artifact.compositions` (R9)
используя `resolveCompositions` / `resolveItemCompositions` из
`@intent-driven/core`.

**Изменения**:
- `List` primitive (catalog/feed body) — вызывает `resolveCompositions(items,
  compositions, world)` ДО filter/sort/render. Это позволяет filter и sort
  использовать aliased paths ("customer.name", "task.title") прозрачно.
- `ArchetypeDetail` — вызывает `resolveItemCompositions(target, compositions, world)`
  при сборке target'а. Detail-проекции с compositions видят alias-поля в slots.

Backward compat: если `artifact.compositions` отсутствует или пуст —
поведение не меняется, zero overhead.

**Зависимость**: `@intent-driven/core >= 0.17` (PR #65 + #67).

Завершает R9 end-to-end chain:
1. Crystallize — R9 добавляет `proj.compositions` (core #65)
2. Runtime — `resolveCompositions` (core #67)
3. **Renderer — List + ArchetypeDetail используют это автоматически** (этот PR)

Теперь автор может объявить `ontology.compositions.Deal = [{entity: "Task", ...}]`,
указать `witnesses: ["task.title", "customer.name"]` в projection — и всё
рендерится без ручного join в domain code.

Тесты: +3 в `containers.r9.test.jsx` (enrichment + filter, backward compat,
empty items). 116/116 renderer tests зелёные.
