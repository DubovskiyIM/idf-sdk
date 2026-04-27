---
"@intent-driven/core": patch
---

feat(crystallize_v2): generalize tier routing к classifyIntentRole consultation

Refactor `salienceDrivenRouting` extension в `assignToSlotsCatalog/Detail`
с hard-coded `intent.salience >= 80` numeric check на полноценное
consultation `classifyIntentRole(intent, mainEntity)`.

Эффект: hero/primaryCTA promotion срабатывает не только для intent'ов с
explicit `salience >= 80`, но и для intent'ов которые `classifyIntentRole`
естественно классифицирует как primary tier:

- **catalog**: creator-of-mainEntity (`intent.creates === mainEntity`) без
  explicit salience — auto-promotion в hero (closes 5 propose-primary
  intents from author audit без host-side annotation).
- **detail**: на detail creator-of-main early-skipped (creates на existing
  entity не нужен), поэтому работает только explicit salience signal —
  поведение неизменное.

Закрывает full set 5 propose-primary intents из A2 author-audit (idf #166)
без обязательной host-side annotation: `booking::add_service`,
`workflow::import_workflow`, `messenger::create_direct_chat`,
`reflect::create_activity`, `reflect::create_tag`.

2 новых теста в `salienceDrivenRouting.test.js`:
- creator-of-main без explicit salience → hero (с feature flag)
- creator-of-main без explicit salience → toolbar (без feature flag)
