---
"@intent-driven/core": minor
---

feat(core): R9 — cross-entity composite projection (MVP)

Новое правило деривации: `ontology.compositions[mainEntity]: CompositionDef[]`
обогащает все проекции с этим mainEntity полями `compositions` (список
join-aliases) и расширяет `entities[]` целевыми сущностями.

Формат композиции:

```js
ontology.compositions = {
  Deal: [
    { entity: "Task", as: "task",     via: "taskId",     mode: "one" },
    { entity: "User", as: "customer", via: "customerId", mode: "one" },
  ],
};
```

Обогащение catalog/detail/feed с `mainEntity === "Deal"`:
- `proj.entities = ["Deal", "Task", "User"]`
- `proj.compositions = [...]`
- `proj.derivedBy += witnessR9Composite(...)`

Incomplete entries (без `entity`/`as`/`via`) игнорируются.

MVP scope: только обогащение проекций. **Не входит в PR:** renderer-поддержка
aliased path lookup (`task.title`), runtime `resolveCompositions(world, ...)`
helper, cascade multi-hop composition. Эти — последующие PR'ы в том же
workstream.

Спецификация: `idf-manifest-v2.1/docs/design/rule-R9-cross-entity-spec.md`.

**Baseline impact** (stacked on R1b + R10):
- До R9: U = 22 (19%)
- После R9: U = 22 (19%)
- **Δ = 0**

Ни один из 10 доменов не объявляет `ontology.compositions` — это новое
поле, предложенное спецификацией. R9 работает корректно (проверено тестами),
но реальное закрытие U требует domain authoring workstream — объявить
compositions в ontologies freelance (Deal, Wallet), delivery (Order, Cart),
sales (Watchlist).

**Совокупный результат SDK workstream**:
- baseline: U = 24 (21%)
- после R1b+R10+R9: U = 22 (19%), Δ = -2 из возможных -13 (15% от spec prediction)

**Главная эмпирическая находка**: SDK-правила корректны, но **impact заблокирован
ontology authoring gap**. Форматная capability появляется инкрементально, но её
полная реализация — параллельный workstream правильной типизации и декларации
в existing ontologies, не SDK change.

Тесты: +4 в witnesses.test.js (basic composition, no-compositions, incomplete
entries filtered, compositions on both catalog+detail). 649/649 зелёные.
