---
"@intent-driven/renderer": minor
---

U-derive Phase 1 — extract 7 переиспользуемых primitives из gravitino host:

- `<ColoredChip text color kind/>` — universal coloured chip (tag/policy/badge tones).
- `<AvatarChip name kind size/>` — letter-avatar (user/group, sm/md/lg).
- `<StatusBadge status label/>` — preset palette (success/failed/running/queued/cancelled/active/inactive). + `STATUS_PALETTE` export для extensions.
- `<IllustratedEmptyState icon title description actionLabel onAction/>` — inline-SVG illustrations (catalogs/files/versions/jobs). NB: renamed из планируемого `EmptyState` чтобы не конфликтовать с существующим SDK `EmptyState` (другая API).
- `<ConfirmDialog visible entityName entityKind onCancel onConfirm/>` — typed-name irreversibility confirmation (primitive). Parallel'ный `controls/ConfirmDialog` остаётся для declarative intent flow.
- `<AssociatePopover title available selected onApply onClose/>` — multiselect popover с search.
- `<TwoPaneShell sections active onSelect title>{children}</TwoPaneShell>` — 2-pane (left submenu + right body).

Foundation для Phase 2 (pattern bank entries derived rendering) и Phase 3 (gravitino host refactor — drop ~30 host components, заменить на declarative projection metadata + SDK primitives).

Backward-compatible — все additive, не меняет существующий API.
