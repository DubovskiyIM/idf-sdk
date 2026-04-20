---
"@intent-driven/core": minor
---

feat(core): R1b — read-only entity catalog rule

Новое правило деривации: если `entity E` не имеет creator-intent'ов
(`creators(E) = ∅`), но либо объявлена `kind: "reference"` (v1.6 онтология),
либо на неё ссылаются foreignKey-поля (`type: "entityRef"`) из других
сущностей — `deriveProjections` выводит `<entity>_list` с
`readonly: true`.

Исключение: `entity.kind === "assignment"` (m2m-связки) не триггерят R1b.

Приоритет: R1 (обычный catalog при `creators ≠ ∅`) имеет приоритет над R1b.

Witness `basis:"crystallize-rule"` с `ruleId:"R1b"`:

```js
{
  input: { entity, creators: [], source: "kind:reference" | "referenced-by", referencedBy },
  output: { kind: "catalog", mainEntity: entity, readonly: true },
  rationale: "Entity.kind === 'reference' + creators = ∅ → read-only catalog"
}
```

Тесты: 5 новых в `witnesses.test.js` (source:kind:reference,
source:referenced-by, assignment-exclusion, isolated-entity-negative,
R1-priority). 641/641 зелёные.

Спецификация: `idf-manifest-v2.1/docs/design/rule-R1b-read-only-catalog-spec.md`.

**Baseline impact** (по measurement через `idf/scripts/uncovered-classification.mjs`
на 10 доменах):
- До R1b: U = 24 (21%)
- После R1b: U = 23 (20%)
- **Δ = -1 (вместо ожидаемых -7)**.

Причина расхождения: большая часть uncovered candidates
(`delivery.zones_catalog`, `delivery.couriers_list`, `booking.service_catalog`,
`lifequest.badge_list`) имеют FK-поля с `type: "text"` вместо `"entityRef"`.
R1b по спеке требует корректной типизации через `entityRef` — это ontology
audit gap, не bug SDK. Фикс ontologies — отдельный workstream.
