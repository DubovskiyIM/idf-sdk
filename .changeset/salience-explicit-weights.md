---
"@intent-driven/core": minor
---

feat(core): явная weighted-sum salience-функция (Phase 2)

Добавляет формальный механизм приоритизации intent'ов через линейную
комбинацию 13 наблюдаемых фич:

- `extractSalienceFeatures(intent, ctx)` — извлекает вектор фич
  (explicitNumber, explicitTier, tier1-4, creatorMain, phaseTransition,
  irreversibilityHigh, removeMain, readOnly, ownershipMatch, domainFrequency)
- `FEATURE_KEYS` — фиксированный контракт набора фич
- `salienceFromFeatures(features, weights?)` — Σ wᵢ·featureᵢ
- `DEFAULT_SALIENCE_WEIGHTS` — веса по умолчанию, откалиброванные под
  поведение implicit ladder (tier1CanonicalEdit/creatorMain=80, tier3Promotion=70 и т.д.)
- `bySalienceDesc(a, b, ctx?)` — опциональный третий аргумент ctx:
  при наличии — weighted-sum режим; без ctx — backward-compat pre-computed ladder
- `projection.salienceWeights` — per-projection override весов (мержится поверх DEFAULT)
- call-sites в `assignToSlotsDetail` и `assignToSlotsCatalog` обновлены на ctx-режим

Host-скрипт `salience-fit-weights.mjs` для калибровки на labeled-dataset (21 суждение)
— отдельный PR в DubovskiyIM/idf (Task 2.3).
