---
"@intent-driven/core": minor
---

Witness `alphabetical-fallback` — видимость spec-debt в артефакте.

Когда `crystallizeV2` разрешает slot-contention через `intent.salience` (§3.5 спеки v1.1) и две или более intent'ов имеют равный salience, финальный выбор делается лексикографически по `intentId`. Этот выбор детерминирован (§9.2 Determinism спеки v1.1) но семантически арбитральный — автор не объявил приоритет между этими intent'ами.

Теперь каждая такая tied группа фиксируется в `artifact.witnesses[]`:

```js
{
  basis: "alphabetical-fallback",
  reliability: "heuristic",          // НЕ rule-based
  slot: "toolbar",
  projection: "listing_detail",
  salience: 60,
  chosen: "add_listing_image",
  peers: ["add_to_bundle", "apply_template", ...],
  recommendation: "Проставьте intent.salience одному из [...]",
}
```

**Новый helper:** `detectTiedGroups(sortedItems, { slot, projection })` — чистая функция, возвращает массив witness-записей.

**Интеграция:**
- `assignToSlotsCatalog` — после `sort(bySalienceDesc)`, перед overflow cap=5
- `assignToSlotsDetail.collapseToolbar` — возвращает `{toolbar, witnesses}`
- `crystallize_v2/index.js` — `slots._witnesses` мержится в `artifact.witnesses[]` перед финальной сборкой артефакта

**Measurable spec-debt** на 9 reference доменах:
```
Грандтотал: 16 alphabetical-fallback witnesses
  planning/invest/delivery: 0 ✓ чисто
  sales: 7 (listing_detail ×2 — 31-intent tied cluster)
  lifequest: 4, workflow/booking/messenger/reflect: 1-2
```

Studio и lint-инструменты могут подсвечивать эти witnesses как «spec smell». Автор видит, какие intent'ы стоит пометить salience явно, чтобы замкнуть tied choice в свойство спеки, а не эвристику алгоритма.

**Philosophical.** Это замыкает обещание спеки v1.1 §9.2 на ref-impl: если impl падает в лексикографический tie-break, артефакт **должен** это явно фиксировать. Tied choice, которое раньше было невидимым «я выбрал что-то», теперь first-class witness в format output.

**Не breaking.** Существующие потребители `artifact.witnesses[]` продолжают работать — новая запись просто добавляется в массив.

**Тесты.** 5 новых unit-тестов на `detectTiedGroups` (624/624 зелёных).
