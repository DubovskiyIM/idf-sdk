---
"@intent-driven/core": minor
---

Salience tie-break ladder: `declarationOrder` (authorial signal из порядка intents в `INTENTS`-object) как tier 1 tiebreaker между equal salience. Alphabetical остаётся tier 2 (last resort).

Witness `basis: "declaration-order"` маркирует резолюцию tier 1 — less noisy чем alphabetical-fallback, не требует массовых intent.salience аннотаций. Author сразу закладывает приоритет порядком declarations: «ставлю важнее первым».

API:
- `bySalienceDesc(a, b)` — ladder: `salience desc → declarationOrder asc → alphabetical asc`
- `classifyTieResolution(a, b)` — новый util, возвращает `"salience" | "declaration-order" | "alphabetical-fallback"`
- `detectTiedGroups(sortedItems, ctx)` — различает basis исходя из declarationOrder uniqueness внутри tied-группы

Breaking: нет. Все existing tests pass (895 core). Авторы без declaration-order получают alphabetical как раньше.

`assignToSlotsDetail` пробрасывает `declarationOrder` в toolbar button specs.
