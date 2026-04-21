---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

**Form-archetype синтезируется из insert-intent'ов** (Workzilla dogfood findings P0-2, backlog §8.2).

Раньше `generateEditProjections` создавал синтетические `*_edit` projection'ы только для replace-intent'ов (detail-based). Insert-intent'ы (`creates: X` / `α:"add"`) не получали form-проекции — автор/скаффолд был вынужден писать `{entity}_create` руками, иначе action-button «Создать задачу» в каталоге открывал пустоту.

**Core:** `generateCreateProjections(INTENTS, PROJECTIONS, ONTOLOGY)` — scan'ит INTENTS по `intent.creates`, для каждого entity (первый insert-intent побеждает) создаёт:

```js
{
  name: "Создать X",
  kind: "form",
  mode: "create",
  mainEntity: X,
  entities: [X],
  creatorIntent: <intentId>,
}
```

Author-override: если `PROJECTIONS["<entityLower>_create"]` уже существует — no-op. Вызывается в `crystallizeV2` entry рядом с `generateEditProjections`; результат мёржится в `allProjections` перед `absorbHubChildren`.

**`buildCreateFormSpec`** строит fields из `intent.parameters` (после native-bridge normalize parameters array). Enrich: onto-label / onto.valueLabels для enum / required. SYSTEM_FIELDS (id / createdAt) пропускаются. Секционирование по `inferFieldRole` — тот же UX, что в edit-форме.

**Renderer:** `ArchetypeForm` поддерживает `body.mode === "create"`:

- Пропускает target-lookup (new row, не existing).
- Initial values из `field.default` (или пустые).
- Пропускает ownership check (owner проставляется сервером из viewer).
- Save → `ctx.exec(creatorIntent, payload)` (вместо execBatch).
- Button label → «Создать» (вместо «Сохранить»).

Закрывает Workzilla acceptance: click по «Создать задачу» из catalog-creator-toolbar → переход на `task_create` → форма title/description/budget/categoryId/deadline.
