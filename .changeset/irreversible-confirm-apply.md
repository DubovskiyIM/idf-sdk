---
"@intent-driven/core": minor
---

feat(core): irreversible-confirm pattern — structure.apply

Добавлена `structure.apply(slots, context)` функция к stable-паттерну
`irreversible-confirm`. Обогащает существующий confirmDialog overlay
полем `warning` из декларативного `intent.__irr.reason`.

**Семантика:** apply не создаёт overlay — он уже строится `controlArchetypes.confirmDialog`
по intent.irreversibility. Apply *обогащает* overlay семантическим warning-текстом
из intent declaration (`__irr: { point, reason }`), чтобы рендерер показал его
над дефолтным typeText-диалогом.

**Pure function.** Не мутирует slots; idempotent.

**Closes:** один из 10 open items v1.12 «pattern-bank: structure.apply для оставшихся stable паттернов».
