---
"@intent-driven/core": minor
---

Добавлен `computeSlotAttribution(intents, ontology, projection)` — карта `{ slotPath → { patternId, action } }` для X-ray режима PatternInspector и derivation-diff CLI. Прокатывает `applyStructuralPatterns` пошагово, фиксирует diff после каждого паттерна.
