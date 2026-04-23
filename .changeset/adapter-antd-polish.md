---
"@intent-driven/adapter-antd": patch
---

Polish round для new Gravitino primitives — reusable jsdom setup, affinity declarations, richer DataGrid cell formatting.

**Reusable vitest setup** (`src/test/setup.js`, подключается через `vitest.config.js setupFiles`):
- `window.matchMedia` stub — AntD v6 responsive observer
- `window.getComputedStyle` wrapper для pseudo-elements (AntD rc-table scrollbar-size)
- `window.ResizeObserver` class-stub
- Auto `cleanup()` afterEach — AntD Popover/Modal portals накапливаются в document.body без этого

**Affinity declarations** (для renderer pickBest scoring):
- `DataGrid.affinity`: types `[json, array]`, fields `[columns, tags, policies, items, rows]`, roles `[table-shape, column-schema]`
- `Wizard.affinity`: roles `[wizard-flow]`
- `PropertyPopover.affinity`: types `[json, map]`, fields `[properties, metadata, labels, attributes, tags]`
- `ChipList.affinity`: types `[json, array]`, fields `[roles, tags, policies, labels, permissions]`

**DataGrid cell formatting** (`renderCellValue`):
- Boolean values → `<Tag color="green">✓</Tag>` / `<Tag>✗</Tag>` (dimmed)
- `col.format = "date" | "datetime"` → monospace YYYY-MM-DD[ HH:mm]
- `col.format = "number"` → `Intl.NumberFormat` с tabular-nums
- `col.format = "currency"` (+ `col.currency`) → `Intl.NumberFormat({style:"currency"})`
- `col.format = "code" | "mono"` → inline code-badge с subtle bg
- `col.chipVariant = "policy" | "role"` → array cells с gold/purple Tag'ами
- ISO date-string auto-detection (`/^\d{4}-\d{2}-\d{2}T/`) → datetime формат без explicit `format`
- Объект → `<code title={full JSON}>first 40 chars…</code>` (tooltip для full content)

**Tests:** +7 unit — DataGrid (boolean cell, currency format, ISO date detection, affinity check), PropertyPopover affinity, Wizard affinity, ChipList affinity. 45/45 pass.
