---
"@intent-driven/core": patch
---

fix(patterns): catalog-creator-toolbar дедуплицирует с tier-routing hero promotion

Без этого fix'а opt-in `ontology.features.salienceDrivenRouting` промотировал
multi-param creator (e.g. confirmation: "form" с salience >= 80) в hero, но
`catalog-creator-toolbar` pattern всё равно добавлял дубликат в toolbar.

Теперь pattern проверяет `existingHeroIds` и пропускает intent'ы уже
размещённые в hero — hero trigger сам активирует overlay через overlayKey.

1 новый тест в `catalog-creator-toolbar.test.js`.
