---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

Polymorphic entities (v0.15): `entity.discriminator` + `entity.variants` — формализация sum-type сущностей с per-variant UI. Закрывает §26 open item «Composite / polymorphic entities» (from v1.6).

**Онтология:**

```js
ontology.entities.Task = {
  kind: "internal",
  discriminator: "kind",            // NEW
  variants: {                       // NEW
    story: { label: "Story", fields: { storyPoints: {type:"number"}, criteria: {type:"textarea"} } },
    bug:   { label: "Bug",   fields: { severity: {type:"enum", values:[...]}, stepsToReproduce: {...} } },
  },
  fields: { id, title, kind: {type:"enum"}, ... },  // shared
  ownerField: "assigneeId",
};
```

**Новые helpers (core):**
- `parseCreatesVariant("Task(bug)")` → `{entity: "Task", variant: "bug"}`
- `getVariantFields(entity, variantKey)` → `{fields: merged, warnings}` (shared + variant.fields, shared wins на конфликтах)

**Crystallize:**
- `buildCardSpec` emit `{variants: {[k]: spec}, discriminator}` для polymorphic entities. Legacy single cardSpec — для monomorphic.
- `inferParameters` резолвит variant из `intent.creates`, использует merged fields, добавляет hidden `{name: discriminator, default: variant, hidden: true}` param.
- Witness `{basis: "polymorphic-variant", pattern: "polymorphic:variant-resolution", reliability: "rule-based"}` в artifact.witnesses для projection с polymorphic mainEntity.

**Renderer:**
- `GridCard` в `primitives/containers.jsx` читает `cardSpec.discriminator` + `item[key]` и выбирает `cardSpec.variants[key]` как effective spec. Unknown variant → fallback на first + console.warn. Backward-compat: cardSpec без `.variants` идёт legacy path.

**Philosophy alignment (манифест):**
- **§26 closes open item** (перенос из v1.6): «union-типы не формализованы в entity.kind»
- **§14 ortho axis** — `discriminator` не conflate с `kind` (ownership/authority axis). Precedent: v0.14 `temporality`.
- **§5 composition** — viewer-scoping через `ownerField` неизменён
- **§15 witness** — declarative → rule-based, ready для promotion
- **§16 Pattern Bank** — не используем (нет author-override use-case)
- **§17 materializations** — pixel fully specialized, agent-API free через existing intent-specialization (creates: "Entity(variant)"), document/voice — v0.2

**`creates: "Entity(variant)"`** — existing parenthetical-creates (`Vote(yes)`, `Booking(draft)`) уже парсится `normalizeCreates`. Новый `parseCreatesVariant` расширяет для формального резолва variant.

**Out of scope v0.15:** per-variant detail sections, variant inheritance (`extends`), runtime type-switching, variant-specific invariants, document/voice enhancement.
