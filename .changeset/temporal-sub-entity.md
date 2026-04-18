---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

Temporal sub-entity kinds (v0.14): `entity.temporality: "snapshot" | "causal-chain"` как ortho axis в онтологии + EventTimeline primitive для inline detail sub-sections.

**Онтология (core):**

```js
ontology.entities.PaymentEvent = {
  kind: "internal",
  temporality: "causal-chain",   // NEW
  ownerField: "paymentId",
  fields: { id: {}, paymentId: {type:"entityRef"}, kind: {type:"enum"}, at: {type:"datetime"}, actor: {type:"entityRef"}, description: {type:"text"} },
};
```

`temporality` ортогонален `kind`: покрывает time-semantics (snapshot = state at moment, causal-chain = event description). Null = default.

**Crystallize:** `assignToSlotsDetail.buildSection` автоматически резолвит field-mapping (`atField`/`kindField`/`actorField`/`descriptionField`/`stateFields`) через `inferFieldRole` + name-regex, и записывает `section.renderAs = { type: "eventTimeline", kind, ... }`. Backward-compat: entities без `temporality` — `renderAs` не добавляется, default-path рендера неизменен.

**Renderer:** новый `EventTimeline` primitive (vertical stepper с dot-markers). 2 kinds:
- `causal-chain`: `● [kind-badge] actor — description · at`
- `snapshot`: `● at` → state-fields inline (`label: value`)

`SubCollectionSection` условный branching: если `section.renderAs.type === "eventTimeline"` — рендерит через primitive, пропуская default path. Экспорт: `import { EventTimeline } from "@intent-driven/renderer"`.

**Witness-of-crystallization (§15 v1.10):** для каждой temporal sub-section — `{basis: "temporal-section", pattern: "temporal:event-timeline", reliability: "rule-based"}` в artifact.witnesses.

**Philosophy alignment:** §14 ortho axis (не conflating с kind), §5 composition (events = subCollection projection), §17 pixel-only v0.14 (document/voice enhancement — v0.2), §23 auto-irreversibility — v0.2.

**Out of scope v0.14:** append-only invariant, auto `__irr` для event-create, section-level field overrides, top-level catalog EventTimeline, document/voice обогащение.
