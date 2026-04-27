---
"@intent-driven/core": minor
---

feat(core): Φ schema-versioning Phase 2 — ontology.evolution[] лог

Append-only лог эволюции онтологии. Каждый entry — `OntologyVersion` с `hash`, `parentHash`, `timestamp`, `authorId`, `diff` (структурные изменения), и опц. `upcasters` (Phase 3).

**Новый публичный API в `@intent-driven/core`:**

| Export | Что |
|---|---|
| `getEvolutionLog(ontology)` | safe read, возвращает `OntologyVersion[]` или `[]` |
| `getCurrentVersionHash(ontology)` | hash последнего entry или `null` |
| `findVersionByHash(ontology, hash)` | `OntologyVersion \| null` |
| `getAncestry(ontology, hash)` | цепочка от root до hash, с защитой от циклов и broken-chain |
| `validateEvolutionEntry(entry)` | shape-check, возвращает `string[]` ошибок (без throw) |
| `addEvolutionEntry(ontology, entry)` | pure, новый ontology с appended entry; throws при invalid/parentHash mismatch/duplicate hash |
| `createEvolutionEntry({ hash, parentHash, authorId, ... })` | convenience constructor с дефолтами |
| `emptyDiff()` | фабрика «нет изменений» для root entry |

**Diff-shape (per spec §4.2):**

```
{
  addedFields:    Array<{ entity, field, default? }>
  removedFields:  Array<{ entity, field }>
  renamedFields:  Array<{ entity, from, to }>
  enumChanges:    Array<{ entity, field, mapping: Record<string, string|null> }>
  splitEntities:  Array<{ from, into[], discriminator }>
  roleChanges:    Array<{ role, diff }>
  invariantsAdded:    string[]
  invariantsRemoved:  string[]
}
```

**Инварианты:**

- `addEvolutionEntry` requires `entry.parentHash === getCurrentVersionHash(ontology)` (или `null` для пустого лога).
- Дублирование `hash` запрещено.
- Pure: input `ontology` не мутируется.
- `getAncestry` защищён от циклов (max 1000 шагов) и возвращает `[]` если chain не достигает root.

**Backward compat.** Онтологии без `ontology.evolution[]` работают как раньше — log читается как пустой `[]`.

38 новых unit-тестов в `evolutionLog.test.js`. Полный core suite **2006/2006** green.
