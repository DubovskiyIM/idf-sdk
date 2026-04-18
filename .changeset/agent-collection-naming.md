---
"@intent-driven/core": patch
---

fix(agent): collection naming canonical camelCase + ISO-expiresAt tolerant

Два исправления в slice'е agent-layer:

- `filterWorldForRole` → `findCollection` теперь пробует коллекции в порядке
  camelCase → lowercase → last-segment (booking legacy `slots`). `outputName`
  всегда canonical camelCase (`agentPreapprovals`, `riskProfiles`, `timeSlots`)
  — это public namespace для агента. Раньше outputName был lowercase, и
  консьюмеры видели `world.agentpreapprovals` для одного entity и
  `world.riskProfiles` (из seed) для другого — inconsistent.
- `checkPreapproval` → `getPreapprovalRow` получил тот же fallback lookup
  (camelCase → lowercase). `notExpired` check теперь принимает ISO-string
  для `expiresAt` через `Date.parse()` fallback — возвращает
  `invalid_expiresAt` только если не number и не parseable string. Раньше
  `Number("2026-10-14T05:48:42Z")` давал NaN и check ошибочно falsebly
  падал на "expired".

Breaking-change-note для консьюмеров: если клиент читал
`world.agentpreapprovals` (legacy lowercase output), нужно переключиться
на `world.agentPreapprovals`. Prototype-side миграция в сопутствующем PR.
