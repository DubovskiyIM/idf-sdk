---
"@intent-driven/core": minor
---

feat(patterns): promote `bidirectional-canvas-tree-selection` → stable

Финальный шаг promotion-path: candidate → stable после закрытия трёх gate'ов:
- Gate 1 (#303): trigger.kind `co-selection-group-entity` (schema-level)
- Gate 2 (#308): renderer primitive `CoSelectionProvider` + hooks
- Gate 3 (#311): adapter capability `interaction.externalSelection` +
  `useCoSelectionEnabled` gate

Changes:
- New `packages/core/src/patterns/stable/cross/bidirectional-canvas-tree-selection.js`
  с `structure.apply` (opt-in через `ontology.features.coSelectionTree` или
  `projection.patterns.enabled`). Apply prepend'ит `coSelectionTreeNav` node
  в `slots.sidebar` с `{ groupEntity, parentField, memberField, targetEntity }`.
- Removed `packages/core/src/patterns/candidate/cross/bidirectional-canvas-tree-selection.js`
  (и пустая директория candidate/cross/).
- `curated.js` — удалён import/export; комментарий обновлён на "Promoted
  в stable 2026-04-24".
- `curated.test.js` — счётчик 7 → 6, archetype distribution: catalog/detail
  (cross promoted).
- `falsification.test.js` — счётчик 36 → 37.
- `registry.js` — импорт + STABLE_PATTERNS entry.

17 новых тестов в `stable/cross/bidirectional-canvas-tree-selection.test.js`:
- schema validity (validatePattern, status/archetype/trigger/apply invariants)
- trigger matching на Selfai-like ontology (Group matches, Node/Workflow/Ghost fail)
- structure.apply: opt-in gate (no-op без signal), happy-path с feature flag
  и с projection.patterns.enabled, prepend preserves existing sidebar items,
  idempotency, no-op при отсутствии array-ref/self-ref, explicit config override
- explainMatch integration на Selfai JSON-shape (Group matched, Node NOT matched)

1339/1339 core tests зелёные.
