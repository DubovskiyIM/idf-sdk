---
"@intent-driven/core": minor
---

feat(core): reader gap policy integration в voice + document materializers

Замыкает «contract orphan» от Phase 4/5 — гpu policy, объявленная в core, теперь применяется в voice и document материализациях. Это **observability-integration**: материализации **декларируют** свою policy в `meta.gapPolicy` и **сообщают** наблюдённый canonical gap-set в `meta.gapsObserved`. Без surgery на rendering — это follow-up, если surface потребует.

**Изменения:**

| Materializer | Что добавлено в output |
|---|---|
| `materializeAsVoice` | `meta.gapPolicy` (default = `getReaderPolicy("voice")`), `meta.gapsObserved` (canonical gap-set) |
| `materializeAsDocument` | `meta.gapPolicy` (default = `getReaderPolicy("document")`), `meta.gapsObserved` |

**Override:** оба принимают `opts.gapPolicy` для per-tenant настроек.

**Применение:** output теперь готов к подаче в `detectReaderEquivalenceDrift` как `ReaderObservation`:

```js
const voice = materializeAsVoice(projection, world, viewer, { ontology });
const document = materializeAsDocument(projection, world, viewer, { ontology });

const report = detectReaderEquivalenceDrift(world, ontology, [
  { reader: "voice", gapCells: voice.meta.gapsObserved },
  { reader: "document", gapCells: document.meta.gapsObserved },
]);
```

**Что НЕ сделано в этом PR:**
- `auditLog` — возвращает плоский array, не подходит под policy-declaration shape (это effect-viewer для audit trails, не §17 reader)
- `agent` reader — живёт в idf host (`server/routes/agent.js`), отдельный PR
- `pixels` reader — `@intent-driven/renderer` ProjectionRendererV2, отдельный PR
- Rendering surgery (gap-aware фильтрация полей в voice/document) — pure observability сейчас, behavior changes по требованию

**Backward compat.** Pure extension — добавляет 2 новых поля в `meta`, не трогает существующие. Caller'ы, не использующие meta.gapPolicy/gapsObserved, не замечают изменений.

11 новых integration-тестов в `materializers/readerGapPolicy.integration.test.js`. Полный core suite **2128/2128** green.
