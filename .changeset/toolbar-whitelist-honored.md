---
"@intent-driven/core": minor
---

feat(assignToSlotsDetail): `projection.toolbar` whitelist honored в crystallize (author-override поверх pattern-bank routing).

До: `projection.toolbar: [intentIds]` нигде не читался SDK'ом — поле игнорировалось. Intents auto-placement-ились SDK pattern-matching'ом:
- phase-transition без params + `irreversibility !== "high"` → `primaryCTA`;
- single-replace-on-main-field → `footer` (через `footer-inline-setter` pattern);
- остальное — `toolbar` или `overflow`.

После: если `projection.toolbar` включает `intentId`, intent **форсируется в toolbar**:
- `assignToSlotsDetail` skip-ает `primaryCTA` routing для whitelisted intents (они идут через обычный `wrapByConfirmation` flow в toolbar);
- `footer-inline-setter.structure.apply` skip-ает whitelisted intents (не переносит в footer, не strip-ит из toolbar).

Author-override прецеденция (detail slot-routing): `footerIntents` → `toolbar` whitelist → автоматика.

Обнаружено в freelance-домене (12-й полевой тест): `task_detail_customer` с `toolbar: [edit_task, publish_task, cancel_task_before_deal, select_executor]` показывал **пустой toolbar** в артефакте — phase-transition intents уходили в primaryCTA/footer, authored list игнорировался.

Тесты: +5 (`assignToSlotsDetail.test.js` — 4 теста whitelist behavior; `footer-inline-setter.test.js` — 1 тест whitelist respect).
