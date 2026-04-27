---
"@intent-driven/core": patch
---

fix(patterns): subcollections pattern уважает `absorbExclude` + `slots.subCollections` (§13d ext)

Notion field-test (2026-04-27) обнажил gap в §13d: после bump'а core@0.94 (с `absorbExclude` на R8 hub-absorption), Block всё равно появлялся в `page_detail.slots.sections` — но через **`subcollections` pattern**, не R8. Pattern auto-derive'ил все FK-children mainEntity без проверки author opt-out, давая то же двойное представление UI: блоки в body + «BLOCK (12)» subсекция.

Также автор Notion положил curated subCollections в **`slots.subCollections`** (nested), но pattern проверял только top-level `projection.subCollections` — author-curation gate не срабатывал.

## Fix

`packages/core/src/patterns/stable/detail/subcollections.js`:

1. Author-curation gate расширен — проверяется и `projection.subCollections` (top-level), и `projection.slots?.subCollections` (nested form, used by notion).
2. `projection.absorbExclude: ["EntityName", ...]` теперь honored — entity'и пропускаются в `findSubEntities` filter, идентично R8 (один сигнал управляет обоими механизмами).

## Behaviour matrix

| Author signal | Pattern behaviour |
|---|---|
| `projection.subCollections: [...]` (top-level) | no-op (existing behaviour) |
| `projection.slots.subCollections: [...]` (nested) | **no-op** (новая ветка) |
| `projection.absorbExclude: ["Block"]` | Block пропускается, остальные FK-children auto-derive |
| ничего | full auto-derive (existing baseline) |

## Тесты

5 новых в `subcollections.test.js`:
- nested `slots.subCollections` — pattern no-op
- `absorbExclude: ["Block"]` — фильтрует Block
- multiple exclude (`["Block","Comment"]`)
- `absorbExclude: []` — baseline
- non-array `absorbExclude` — silently ignored

Полный core: **1896/1896 passing**.

## Notion-host

После релиза core@~0.96: notion `page_detail.absorbExclude: ["Block"]` (уже на месте) теперь полностью убирает Block subсекцию — блоки только в body через canvas.
