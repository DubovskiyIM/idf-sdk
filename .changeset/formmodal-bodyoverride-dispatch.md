---
"@intent-driven/renderer": minor
---

G-K-12 renderer follow-up: FormModal dispatch на Wizard primitive
(или TabbedForm) когда `spec.bodyOverride` задан.

Без этого core PR idf-sdk#275 (passthrough authored
`<entity>_edit.bodyOverride` в overlay.bodyOverride) не имел render
effect — modal продолжал рендерить flat parameters list.

Поведение:
- `bodyOverride.type === "wizard"` — render Wizard primitive со steps
  + breadcrumb + step-navigation + onSubmit
- `bodyOverride.type === "tabbedForm"` — minimal inline TabbedForm
  с tabs + per-tab field render + aggregated submit
- Unknown type — fallback на flat parameters (backward-compat)

После этого Stage 5 wizards в Keycloak (realm/client/IdP create-flows
авторированные через `bodyOverride: { type: "wizard", steps: [...] }`)
работают и для EDIT через row-action ✎ Изменить.

4 unit-tests + renderer suite 499/499 green.
