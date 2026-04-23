---
"@intent-driven/renderer": patch
"@intent-driven/adapter-mantine": minor
"@intent-driven/adapter-shadcn": minor
"@intent-driven/adapter-apple": minor
---

Adapter-specific нативные chips для `ChipList` primitive.

`ChipList` теперь делегирует не только через `ctx.adapter.getComponent` (для unit-тестов), но и через глобальный `getAdaptedComponent` из `renderer/adapters/registry.js` — т.е. автоматически резолвится в runtime после `registerUIAdapter(mantineAdapter)` / etc. Back-compat: если адаптер не реализует `chipList`, fallback на built-in span'ы.

Добавлены native-компоненты:

- **adapter-mantine** — `MantineChipList` использует Mantine `Badge` с `ActionIcon` для `×`, color-map по variant (gray/orange/violet)
- **adapter-shadcn** — `ShadcnChipList` в doodle-стилистике: hand-drawn границы, font-doodle, custom `×` кнопка
- **adapter-apple** — `AppleChipList` glass-morphism: pill-shape, semi-transparent fill по variant (gray/orange/purple), subtle backdrop-blur border

`@intent-driven/adapter-antd` уже имел `AntdChipList` (native `Tag` с `closable`) — не менялся, но теперь вызывается через общий путь.

Capability declaration (`primitive.chipList: { variants: ["tag", "policy", "role"] }`) добавлена во все 4 адаптера.

Follow-up: attach-picker modal теперь полностью закрыт (через #235), так что сессия по Gravitino-паттернам завершена — `inline-chip-association` / `lifecycle-gated-destructive` / `reverse-association-browser` работают end-to-end во всех 4 visual языках.
