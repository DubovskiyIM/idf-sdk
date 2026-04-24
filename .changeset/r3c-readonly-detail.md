---
"@intent-driven/core": minor
---

feat(deriveProjections): R3c — read-only detail для catalog без mutator'ов

До fix'а R3 генерил `<entity>_detail` только когда `|mutators(E)| > 1`.
Сценарий из Fold shop:

- customer.canExecute = [list_book, add_to_cart, ...]
- host (runtime) фильтрует INTENTS по canExecute ДО crystallize
- Book остался с единственным list_book (read) — R1b генерит
  read-only catalog (Book referenced by CartItem.bookId)
- R3 skip: mutators = 0 → нет book_detail → onItemClick = NONE

Клик по карточке книги у customer'а был мёртвый, у staff работал
(staff имеет update_book + delete_book → mutators > 1 → R3).

## Fix

Новая ветка R3c в deriveProjections:

```js
if (mutatorCount > 1) {
  // R3: editable detail (как раньше)
} else if (projections[`${lower}_list`]) {
  // R3c: read-only detail — catalog есть, mutators нет
  projections[`${lower}_detail`] = {
    kind: "detail",
    readonly: true,
    idParam: `${lower}Id`,
    derivedBy: [witnessR3cReadOnlyDetail(entityName, source)],
  };
}
```

- `readonly: true` — renderer скрывает edit/delete CTA-toolbar
- `idParam: <entity>Id` — ArchetypeDetail резолвит target из routeParams
- `witness.ruleId = "R3c"` — явный след для debug

R3b (singleton my_*_detail) теперь skip'ит read-only base — он даёт
owner-scoped edit surface, без mutator'ов бессмыслен.

## Covered cases (+3 new tests)

- R1b catalog (referenced entity без creators) → R3c read-only detail
- R1 catalog с 1 creator (create-only domain) → R3c read-only detail
- R3 (writable) срабатывает как раньше когда mutators > 1 — R3c не мешает
