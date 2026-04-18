---
"@intent-driven/core": minor
---

`checkComposition` dominance rule: `remove` на базовой коллекции конфликтует с field-level effect на той же сущности.

## Проблема

До фикса `checkComposition({alpha:"replace", target:"items.status"}, {alpha:"remove", target:"items"})` возвращал `{compatible: true, resolution: "different_target"}` — потому что строки target отличаются.

Но семантически они конфликтуют: нельзя `replace` поле сущности, которую одновременно `remove`. Это нарушает intent-композицию: если выполнить обе `replace` и `remove` на одну сущность, результат определён только их причинным порядком, что не derivable из спеки без дополнительных предположений.

## Фикс

Dominance rule в `checkComposition`:

- Если один эффект — `remove` на **базовой коллекции** (target не содержит `.`)
- Второй — effect на **field-path** той же коллекции (target содержит `.`)
- Результат: **conflict** (⊥)

Раньше такие пары трактовались как `different_target`. Это расхождение с spec §6 и причина провала conformance-test `level-3/composition-001`.

## Эффект на conformance

С этим fix'ом + host-side runner changes (idf#39) → **55/55 conformance тестов проходят**.

## Совместимость

- **Forward**: добавляется дополнительный conflict-случай, который ранее был false-compatible. Domains, которые этот случай использовали (один intent removing entity, другой editing его field), теперь получат algebra excluding-edge между ними — что корректно. Эти пары обычно не should-co-execute.
- **Существующие тесты**: 619/619 passing (нет регрессии — тесты не полагались на false-compatible случай).

## Связанное

- idf#38 — conformance фикстуры в canonical format + runner (merged)
- idf#39 — level-3 findings alignment + level-1/2 runner fixes (merged)

После слияния этого PR + release: все conformance-testы проходят end-to-end на @intent-driven/core.
