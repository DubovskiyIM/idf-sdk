---
"@intent-driven/core": patch
---

test(core): property-based тесты на R0→R5 transitions

Добавлены fast-check property-тесты для проверки инвариантов
между фазами кристаллизации:
- R0→R1 conservation: accessible intents касаются mainEntity + subset allowList
- R1→R2 reachability: slots ⊆ accessible (containment); replace+click → slot
- R2→R3 primary slot: intent с max salience в primary slot или первых 2 toolbar
- R4→R5 stub-renderer: intentId сохраняются после stub-render

R3→R4 (capability contract) — skip, требует renderer + jsdom (отдельный follow-up).
