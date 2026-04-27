---
"@intent-driven/core": minor
---

patterns: composite-key API для глобально уникальной идентификации паттернов между bank'ами (closes idf backlog §13.1).

Один и тот же паттерн может одновременно быть в `stable/<arch>/<id>.js` и в `candidate/<source>-<id>.json` (как «новое наблюдение в другом продукте»). Plain `id`-lookup ломал FK collisions в Φ при кросс-bank-операциях (mета-домен, promote-flow).

Новые helpers:

- `patternKey(p)` → composite ключ: `stable__<id>` / `candidate__<id>__<source?>` / `anti__<id>`
- `isSameLogicalPattern(a, b)` — true если same logical-id, независимо от bank
- `findPatternByKey(patterns, key)` — collection lookup по composite-ключу
- `parsePatternKey(key)` → `{status, id, sourceProduct}` (round-trip с patternKey)
- `logicalId(p)` — bare id без status/source prefix

Backward-compat: `pattern.id` остаётся unchanged. patternKey — opcional layer поверх. Существующий код не ломается.

Prerequisite для §13.17 (apply-derivation gap) на масштабе: каждый promoted candidate теперь имеет formal globally-unique key.
