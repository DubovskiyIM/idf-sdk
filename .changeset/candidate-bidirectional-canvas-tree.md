---
"@intent-driven/core": patch
---

feat(patterns): candidate `bidirectional-canvas-tree-selection` (cross-archetype)

Добавлен curated-candidate в `packages/core/src/patterns/candidate/cross/` —
первый формализованный cross-projection state-sharing паттерн. Описывает
co-selection между canvas-archetype проекцией (граф/map/flow) и
catalog+hierarchy-tree-nav проекцией, группирующей элементы canvas по
semantic buckets (правила, папки, workflow-группы).

Источник: Selfai workflow-editor dogfood 2026-04-24. Полевая валидация —
Figma layers, n8n workflow zones, Dataiku DSS, Blender hierarchy,
React DevTools, VSCode outline. Селфаевский JSON (`thirdPartyData.gui.groups`
с `nodeIds[]` + `parentGroupId`) — конкретный shouldMatch-кейс.

Status: matching-only. Promotion в stable требует:
- новый trigger.kind `co-selection-group-entity` в schema.js;
- renderer primitive contract для shared `__ui.selection.nodeIds`;
- adapter capability `supportsExternalSelection` для graceful fallback.

Registered в `curated.js`. validatePattern (falsification.shouldMatch ×3 +
shouldNotMatch ×5) проходит через существующий candidate-test-harness.
