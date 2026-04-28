---
"@intent-driven/core": minor
---

feat(core): Φ schema-versioning Phase 4 — Reader gap policy

Контракт «equivalent information content **under the same gap policy**» (reader-equivalence §23 axiom 5, обновление под Phase 4). Формализует поведение 4 материализаций при обнаружении gap'а в данных: missing field, unknown enum value, removed entity ref.

**Новый публичный API в `@intent-driven/core`:**

| Export | Что |
|---|---|
| `DEFAULT_READER_POLICIES` | Frozen-объект с дефолтами для pixels / voice / agent / document |
| `DEFAULT_PLACEHOLDER` | `"—"` универсальный fallback |
| `getReaderPolicy(reader, override?)` | возвращает policy с опциональным merge override |
| `detectFieldGap(value, fieldDef, ctx?)` | возвращает GapDescriptor или null |
| `resolveGap(gap, policy, opts?)` | gap + policy → GapResolution с action и опц. value/placeholder |
| `resolveFieldGap(value, fieldDef, policy, ctx?)` | композиция detect + resolve |
| `scanEntityGaps(entity, fieldDefs, ctx?)` | собирает все gap'ы в row — для Layer 4 detector'а |

**Три типа gap'а:**

- `missingField` — поле отсутствует (legacy effect до того, как поле было добавлено)
- `unknownEnumValue` — значение не входит в текущий enum (упразднено или переименовано без upcaster'а)
- `removedEntityRef` — ref-поле указывает на сущность, которой нет в world

**Шесть стратегий разрешения** (action verbs, не reader-specific):

| Action | Семантика |
|---|---|
| `hidden` | скрыть в UI, отметить в a11y / debug |
| `omit` | не упоминать вовсе (aggressive — для voice / brevity) |
| `placeholder` | показать «—» / customizable через options |
| `passthrough` | показать original value as-is |
| `broken-link` | для refs: показать с отметкой broken |
| `error` | strict mode — surface как ошибку |

**Дефолтные policies (per spec §4.5):**

```
pixels:   { missing: hidden,      enum: passthrough, ref: broken-link }
voice:    { missing: omit,        enum: omit,        ref: omit }
agent:    { missing: omit,        enum: passthrough, ref: broken-link }
document: { missing: placeholder, enum: placeholder, ref: broken-link }
```

**Reader-equivalence обновлена:** все 4 reader'а должны давать одинаковый **gap-set** (где-то поле missing → у всех или ни у кого) под одной policy. Dispersion gap-set'ов — drift-event для Layer 4 detector'а (Phase 5).

**Detection особенности:**

- Поддерживает enum через `{type:"enum", values:[]}` ИЛИ host-style `{valueLabels:{...}}`.
- Ref через `{type:"ref"|"entityRef", entity:"User"}`.
- Resolution refs: пробуем PascalCase ключ (core fold), lowercase (engine), plural (typeMap).

**Backward compat.** Никаких изменений в существующих API. Phase 4 — pure-extension; readers интегрируют policy в follow-up PRs (renderer / voiceMaterializer / documentMaterializer / agent route).

42 новых unit-тестов в `readerGapPolicy.test.js`. Полный core suite **2094/2094** green.
