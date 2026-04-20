---
"@intent-driven/core": patch
---

feat(patterns): formalization apply для 5 patterns (hero-create, phase-aware-primary-cta, antagonist-toggle, composer-entry, inline-search).

**Формализационный batch** — apply'и, которые не изменяют SDK-логику маршрутизации intent'ов в слоты (она уже реализована в `assignToSlots*` + archetypes), а **маркируют** результирующие slot-элементы с `source: "derived:<pattern-id>"`. Renderer может opt-in в pattern-specific styling.

Плюс `antagonist-toggle` эмитит `slots._toggles: [{a, b}]` — ранее этой metadata не было, пары ранее коллапсились только в overflow.

### hero-create
`slots.hero[heroCreate].source = "derived:hero-create"` (формализация existing SDK catalog heroCreate routing).

### phase-aware-primary-cta
`slots.primaryCTA[*].source = "derived:phase-aware-primary-cta"` (формализация existing SDK detail phase-transition routing). Не перетирает уже-заданный source.

### antagonist-toggle
Новая metadata `slots._toggles = [{ a: "pin_message", b: "unpin_message" }, ...]` — pair detection via `intent.antagonist` cross-reference. Renderer может объединить пару в single toggle-button вместо двух отдельных. Dedup (A→B и B→A → одна запись).

### composer-entry
`slots.composer.source = "derived:composer-entry"` (формализация feed composerEntry archetype).

### inline-search
`slots.toolbar[inlineSearch].source = "derived:inline-search"` (формализация projection-level search archetype).

## Тесты

- hero-create: 4 теста
- phase-aware-primary-cta: 3 теста
- antagonist-toggle: 6 тестов
- composer-entry: 3 теста
- inline-search: 3 теста
- **Итого**: +19 core тестов. **1038 passing**.

## Roadmap progress

Было 8 → **3** оставшихся stable patterns без apply (13/16 = 81%).

Осталось:
- `optimistic-replace-with-undo` (behavior-only, сложно encode declaratively)
- `keyboard-property-popover` (renderer-heavy — новый primitive)
- `global-command-palette` (renderer-heavy — ⌘K overlay)

Тип `patch` — формализация не меняет runtime behavior, только маркирует metadata для renderer.
