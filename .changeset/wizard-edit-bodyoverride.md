---
"@intent-driven/core": minor
---

Fix G-K-12: для α=replace intents formModal overlay подхватывает
authored `<entityLower>_edit.bodyOverride` (если задекларирован) —
позволяет author'у определить edit-flow через Wizard / TabbedForm
primitive вместо flat parameters list.

Без этого fix Stage 5 wizards в Keycloak (realm/client/IdP) работали
только для CREATE flow (через hero `createX`), а EDIT через row-action
✎ показывал flat formModal с parameters list.

Изменения:
- `controlArchetypes::formModal.build` — новый helper
  `lookupEditBodyOverride(intent, context)` для α=replace intents
  смотрит `context.projections[<entityLower>_edit].bodyOverride` и
  передаёт на `overlay.bodyOverride`.
- `assignToSlots` / `assignToSlotsCatalog` / `assignToSlotsDetail` —
  signature расширен `opts.projections` для прокидывания allProjections.
- `crystallize_v2::index.js` — два call site (catalog/detail body +
  views expansion) передают `allProjections` через opts.

Backward-compat: opts default `{}`, без `projections` в context —
fallback на старое (только parameters). Existing domains не аффектированы.

Renderer FormModal должен подхватить `spec.bodyOverride` для dispatch
на Wizard / TabbedForm primitive — отдельный follow-up PR в renderer.

5 unit-tests + core suite 1277/1277 green.
