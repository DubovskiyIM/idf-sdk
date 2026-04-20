---
"@intent-driven/core": patch
---

Salience declaration-order tiebreak расширен на `assignToSlotsCatalog` (catalog/feed projections). Ранее был только в `assignToSlotsDetail` — catalog-toolbar'ы продолжали falling back to alphabetical.

Теперь declarationOrder пробрасывается из `Object.entries(INTENTS)` index во все toolbar-push'ы catalog'а (creator, projection-level overlay, projection-level click, inlineSearch).

Zero-breaking: backward-compat через Infinity fallback при missing declarationOrder. Existing 895 тестов passing без regression.

Host impact: после bump → `sales/listing_feed` alphabetical-fallback witnesses (4 остаточных после host #70) должны упасть до 0.
