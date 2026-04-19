---
"@intent-driven/core": minor
---

feat(core): resolveCompositions — runtime helper для R9 aliased-fields

Завершает R9 end-to-end: crystallize добавляет `proj.compositions`,
runtime раскрывает alias'ы при чтении из `world`.

API:

```js
resolveItemCompositions(item, compositions, world) → enrichedItem
resolveCompositions(items, compositions, world)    → enrichedItems[]
getAliasedField(item, "task.title")                → value | undefined
```

Режимы:
- `mode: "one"` (default) — `item[as] = world[entity].find(x => x.id === item[via])`
- `mode: "many"` — `item[as] = world[entity].filter(x => x[via] === item.id)`

Обработка edge-cases:
- Missing FK value → `null` (one), `[]` (many).
- Missing entity в world → `null` (one), `[]` (many).
- Items не мутируется (чистая функция).

`getAliasedField(item, path)` — null-safe lookup для multi-level path'ов
(`"customer.address.city"`). Consumer — primitive atoms в
@intent-driven/renderer, которые должны уметь рендерить `witnesses`
вида `"task.title"` без падения на undefined.

Спецификация: `idf-manifest-v2.1/docs/design/rule-R9-cross-entity-spec.md`.

Тесты: +16 в resolveCompositions.test.js (one/many mode, missing refs,
batch, null-safety, multi-level paths). 673/673 зелёные.

Следующий шаг для end-to-end R9: обновить primitive atoms в
@intent-driven/renderer чтобы использовать `getAliasedField` при чтении
alias-полей из `proj.witnesses`. Отдельный PR в renderer-пакете.
