---
"@intent-driven/renderer": minor
---

Fix G-K-23: ProjectionRendererV2 validation теперь soft-warn по умолчанию
(console.warn + render продолжается) вместо hard-fail с red box.

Раньше `validation.errors !== []` всегда блокировал render. Это создавало
visual regressions при любой mismatch (например, неизвестный control type,
duplicate overlay key, unknown primitive) — даже когда artifact мог быть
рендерен корректно.

Новое поведение:
- **Default**: validation errors → console.warn (с подробной диагностикой)
  + render продолжается. Renderer пытается рендерить archetype, ошибки
  попадают в DevTools, не в UI.
- **Strict mode** (`validationStrict={true}` prop): hard-fail с red box —
  старое поведение. Используется в Studio authoring environment / CI
  где любая invalidity критична.

Discovered в Keycloak dogfood-спринте 2026-04-23 — formModal с
`control:"checkbox"` (теперь fixed в #259) делал UI неиспользуемым на
все 200+ overlay keys, хотя сам artifact рендерился бы корректно.
