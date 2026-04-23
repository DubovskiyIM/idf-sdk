---
"@intent-driven/renderer": minor
---

Два новых primitives — `PropertyPopover` и `ChipList` для property-dicts и association-коллекций.

## PropertyPopover

Compact inline summary + click-reveal detail panel для key-value `properties: {}` полей. Classical pattern для AWS tags, K8s annotations, Gravitino metalake/catalog/schema properties.

**Shape:**
```js
<PropertyPopover value={{ env: "prod", region: "us-east-1", ... }} maxInline={3} />
```

**Фичи:**
- Inline chips (первые N entries) + `+M` overflow trigger
- Counter label ("5 properties") как aria-description
- Click trigger → popover overlay со ВСЕМИ entries (scrollable, max-height 320)
- Close on: second click / Escape / outside click
- `aria-expanded`, `aria-haspopup`, `role="dialog"` a11y
- Value formatting: boolean → "true"/"false", null → "—", object → stringified (60ch trunc)

## ChipList

Array-values как chip-коллекция с variant-стилизацией и detach/click interactions.

**Shape:**
```js
<ChipList
  value={["PII", "Financial"]}
  variant="tag"              // "tag" | "policy" | "role"
  maxVisible={5}
  onDetach={(item, i) => ...} // optional — показывает × на chip
  onItemClick={(item) => ...}  // optional — клик по chip
/>
```

**Фичи:**
- String items → простой chip с текстом; object items `{name, color?, icon?}` → styled chip
- Three variants: `tag` (neutral gray), `policy` (amber), `role` (purple)
- Overflow: `maxVisible` + `+N` badge
- Detach × button (stopPropagation чтобы не вызвать onItemClick)
- Keyboard-accessible (Enter/Space на clickable chip)
- Adapter delegation для native AntD Tag / Chip

## Use-cases

Gravitino (docs/gravitino-gaps.md):
- **G37 PropertyPopover** — `Metalake.properties`, `Catalog.properties`, `Schema.properties`, `Table.properties` → активация через `field.primitive: "propertyPopover"`
- **G22 ChipList** — `Catalog.tags`, `Catalog.policies`, `User.roles`, `Group.roles` → `field.primitive: "chipList"` + variant

**Tests:** +16 PropertyPopover + +13 ChipList = 29 new, 396/396 renderer pass.

**Closes:** G22 (chip-associations), G37 (PropertyPopover primitive).
