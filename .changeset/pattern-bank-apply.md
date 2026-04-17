---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

Pattern Bank: первая волна `structure.apply` + `explainMatch` + first-class witnesses.

**@intent-driven/core** (minor):
- Новая точка `explainMatch(intents, ontology, projection, options)` — единая SDK-surface для authoring-env tooling (Studio viewer + prototype inspector). Возвращает archetype, behavioral (resolvePattern), structural (matched + nearMiss), witnesses, artifactBefore/After, previewPatternId.
- `evaluateTriggerExplained` — per-requirement breakdown trigger'а. `evaluateTrigger` остаётся wrapper'ом.
- `matchPatterns(intents, ontology, projection, { includeNearMiss })` — расширенная форма возвращает `{ matched, nearMiss }` с entries вида `{ pattern, explain, missing }`. Legacy shape (array) — без изменений при отсутствии options.
- `structure.apply(slots, context)` — чистая функция в паттернах, обогащает slots при кристаллизации. Реализовано для 3 паттернов:
  - `subcollections` — добавляет sub-entity секции в detail-архетипе (FK-based auto-discovery с last-camelCase-segment fallback, pluralization y→ies / is→es / s,x,z,ch,sh+es).
  - `grid-card-layout` — выставляет `body.layout="grid"` + cardSpec из witnesses для catalog. Author-override: любой `body.layout` — no-op.
  - `footer-inline-setter` — single-replace intents перемещаются в footer как inline-setters. Author-override: существующие footer items не перетираются.
- `applyStructuralPatterns(slots, matched, context, preferences, registry)` — встроено в crystallize pipeline (внутри шага 3). Feature-flag `ontology.features.structureApply` как kill-switch.
- `projection.patterns: { enabled, disabled }` — author-level preference для force-apply / force-skip паттерна. Часть input'а кристаллизации, не snapshot артефакта (§16 перегенерируемость).
- `artifact.witnesses[]` — pattern matching как first-class §15 finding c `basis: "pattern-bank"`, `reliability: "rule-based"`, `requirements: [{ kind, ok, spec }]`.
- Helpers `findSubEntities`, `buildSection`, `sectionIdFor`, `buildCardSpec` — экспортированы для переиспользования.

**@intent-driven/renderer** (minor):
- `ProjectionRendererV2` prop `artifactOverride` — dev-only override (§27 authoring-env). Приоритетнее штатного `artifact`. Когда задан — используется напрямую; когда отсутствует — поведение без изменений.
- `ProjectionRendererV2` prop `previewPatternId` — передаётся в ctx для overlay над derived-слотами.
- Новый primitive `PatternPreviewOverlay` — dashed-border + corner-badge с pattern id. Применяется в `SlotRenderer` и `ArchetypeDetail` для слотов с `source: "derived:..."` когда `previewPatternId` активен.

**Обратная совместимость:**
- Все новые поля артефакта (`witnesses`, `pattern`, `body.layout`, `body.cardSpec`, `slots.sections[].source`) — additive.
- `matchPatterns` legacy array-shape сохранён.
- `evaluateTrigger` работает идентично.
- `structure.apply` опциональное — паттерны без него продолжают работать только как matching-only.
