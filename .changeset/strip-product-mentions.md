---
"@intent-driven/core": patch
---

chore: убраны имена внешних продуктов из исходников и комментариев `@intent-driven/core`

Заменены имена field-test источников на нейтральные обозначения («workflow-editor field-test», `fieldTestOntology`, `fieldTestGroupProjection`). Затронутые места:

- `packages/core/src/patterns/registry.js` — комментарии у import/STABLE_PATTERNS entry для `bidirectional-canvas-tree-selection`.
- `packages/core/src/patterns/stable/cross/bidirectional-canvas-tree-selection.js` — header doc-block, rationale.evidence, falsification.shouldMatch reason.
- `packages/core/src/patterns/stable/cross/bidirectional-canvas-tree-selection.test.js` — переименованы тестовые fixture-переменные.
- `packages/core/src/patterns/candidate/curated.js` — комментарий promotion-history.
- `packages/core/CHANGELOG.md` — формулировки в записях `0.66.1` и `0.67.x`.

Без функциональных изменений. 1501/1501 core-тестов зелёные.
