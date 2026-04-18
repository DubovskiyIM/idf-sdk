---
"@intent-driven/core": minor
---

Функториальность `crystallizeV2` под permutation INTENTS/PROJECTIONS + PoC `intent.salience` как первоклассный tiebreaker.

**Функториальность (§16).** Результат `crystallizeV2` больше не зависит от порядка авторства ключей INTENTS/PROJECTIONS. Ключи нормализуются алфавитной сортировкой на входе — downstream iteration наследует стабильный порядок. Эмпирическая база (`idf/scripts/functoriality-probe.mjs` на 9 доменах): до фикса 0/9 доменов строго функториальны (121 проекция: 70 identical / 35 order-only / 16 semantic); после фикса — 9/9 строго функториальны.

**Поведенческое изменение.** Tie-break при slot-contention теперь алфавитный по intentId, а не «порядок авторства». Артефакты могут отличаться от зафиксированных в v0.15: см. snapshot-тесты в потребителях. API совместим.

**`intent.salience` PoC.** Новый helper `computeSalience(intent, mainEntity)`:

- Explicit: `intent.salience: number` или `"primary" | "secondary" | "tertiary" | "utility"` (разворачивается в 100/50/20/5)
- Computed из particles:
  - creator main entity → 80
  - phase-transition (replace `.status` на main) → 70
  - edit main → 60
  - default → 40
  - destructive-main → 30
  - read-only → 10

PoC scope — только `assignToSlotsDetail.collapseToolbar`: standalone кнопки сортируются `bySalienceDesc` перед срезом capacity=3. Tied salience → alphabetical. Обратная совместимость: 0 обязательных правок existing intent'ов, computed defaults покрывают весь corpus.

**Философское значение.** Заявление «IDF — формат» держится на том, что crystallize — функция от семантики, не от порядка авторства. До фикса это было ложно эмпирически на всех 9 доменах. Salience делает выбор при slot-contention свойством спеки, а не эвристикой алгоритма — alphabetical становится явным финальным fallback'ом.

**Roadmap (не в этом релизе):**

- witness `alphabetical-fallback` — сделать tied salience видимым в `artifact.witnesses[]` как «spec smell»
- salience в `assignToSlotsCatalog` (capacity=5)
- `projection.salienceOverride` для multi-projection доменов
