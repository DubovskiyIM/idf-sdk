---
"@intent-driven/core": minor
---

feat(core): Φ schema-versioning Phase 5 — Layer 4 drift detector

Runtime-проверка reader-equivalence (§23 axiom 5): 4 материализации pixels / voice / agent / document на одной world-slice должны давать совпадающий gap-set в пересечении их scope.

**Новый публичный API в `@intent-driven/core`:**

| Export | Что |
|---|---|
| `gapCellKey(entity, entityId, field)` | стабильный ключ "entity:id:field" |
| `computeCanonicalGapSet(world, ontology, opts?)` | canonical gap-set по core-логике |
| `compareReaderObservations(canonical, observations)` | N-way сравнение, EquivalenceReport |
| `detectReaderEquivalenceDrift(world, ontology, observations, opts?)` | композиция compute + compare |
| `buildPerfectObservation(reader, canonical)` | helper для test fixtures |

**Что детектор делает:**

1. Вычисляет canonical gap-set по `world` через `scanEntityGaps` (Phase 4).
2. Принимает observations от N reader'ов.
3. Для каждой cell, попадающей в scope ≥ 2 reader'ов, проверяет: либо все агрегированные reader'ы видят gap, либо никто. Дивергенция → `DriftEvent`.

**Что детектор НЕ делает:**

- Не сравнивает rendered output (HTML vs SSML vs JSON — incomparable shapes).
- Не проверяет equivalence ACTIONS (action может разниться по policy — это контракт). Проверяется gap-presence.
- Не вызывает reader'ы — observations передаются caller'ом. Phase 5 — scaffold; reader integrations добавятся в follow-up PRs (renderer / voiceMaterializer / documentMaterializer / agent route).

**Scope-семантика:**

- `observation.scope === undefined` → reader видит всё (full equivalence required).
- `observation.scope: string[]` → список cellKey'ев в scope; cells вне scope игнорируются для этого reader'а.
- DriftEvent эмитится только когда cell ∈ scope ≥ 2 reader'ов и наблюдения расходятся.

**EquivalenceReport:**

```
{
  equivalent: boolean,           // true ↔ events.length === 0
  events: DriftEvent[],
  summary: {
    totalCells: number,
    driftCells: number,
    perReaderGapCount: Record<string, number>
  }
}
```

**Применения:**

- CI snapshot-тесты: каждый раз перед merge'ем убеждаемся, что 4 reader'а согласованы на golden Φ.
- Production observability: в dev-mode прогонять detector на каждый submit, alert на дивергенцию.
- Compliance: для audit'а — proof that 4 материализации agree.

**Backward compat.** Pure extension. Никаких изменений в существующих API.

23 новых unit-теста в `driftDetector.test.js`. Полный core suite **2117/2117** green.
