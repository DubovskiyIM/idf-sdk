---
"@intent-driven/core": minor
---

feat(crystallize_v2): default-flip tier-driven slot routing — opt-in → opt-out

Завершает trajectory начатую #434 (opt-in tier-driven routing) → #436 (pattern
dedup) → #438 (classifyIntentRole consultation). После host-side audit
(idf #168) подтвердившего 42 implicit-primary creator-of-main intents в 12
доменах align с пользовательским ожиданием (canonical "Add" CTA в hero),
default flip'нут с opt-in (`=== true`) на opt-out (`!== false`).

Trajectory совпадает с Phase 3d.3 (`respectRoleCanExecute` opt-in → flip).

## Effect after default-flip

- **catalog**: creator-of-mainEntity intent (включая no-explicit-salience) →
  `slots.hero` (если hero пустой и shape != timeline/directory)
- **detail**: intent с `salience >= 80` без params/destructive → `slots.primaryCTA`

Author opt-out paths:
1. `ontology.features.salienceDrivenRouting: false` — domain-wide
2. `intent.salience < 80` (secondary tier) — per-intent для creators

## Tests

2 legacy теста в `assignToSlotsCatalog.test.js` обновлены: добавлен
`features.salienceDrivenRouting: false` в ONTOLOGY чтобы продолжить
тестировать heroCreate-path / customCapture flow без tier-routing
интерференции.

8 новых assertions в `salienceDrivenRouting.test.js` для default-flip
trajectory: default behavior, explicit opt-out (false), explicit opt-in
(true), creator-of-main без annotation auto-promotion.

Total: 1945 tests passed (146 files).

## Roadmap

- ✓ #434 (numeric salience tier routing)
- ✓ #436 (catalog-creator-toolbar dedup)
- ○ #438 open (classifyIntentRole consultation) — **prerequisite**
- ○ **этот PR** (default-flip)
- ○ Symmetric utility tier routing — отдельный шаг
