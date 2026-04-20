# Invariants schema robustness + multi-owner + domain scoping — design spec

**Дата:** 2026-04-20
**Ветка:** `feat/invariants-ownership-domain-scoping` (idf-sdk)
**Парный PR:** host freelance domain update (отдельно в `idf/`)
**Связано:** `docs/sdk-improvements-backlog.md` §1.1 / §1.4 / §3.2 (frelance field-test P0)

## Проблема

Freelance field-test (2026-04-19) выявил 4 P0 блокера в SDK core, на которые накладывались локальные workaround'ы в `idf/src/runtime/DomainRuntime.jsx`. Три из них объединяются одной темой — **контракт онтологии и viewer-scoping недостаточно богат для реальных доменов**:

1. **Handler schema drift (§1.1).** Invariant-handler'ы ожидают strict shape; TypeError cascades в effect rollback, отменяя legitimate изменения мира.
2. **Domain scoping (§1.4).** `lifequest.tasks` и `freelance.tasks` делят SQL table. Transition-invariant freelance'а ловит lifequest row'ы и ломает каскад.
3. **Multi-owner (§3.2).** `Deal.ownerField = "customerId"` покрывает только одного владельца; executor (second legitimate owner) теряет visibility.

Все три вместе — **схемная robustness**. Формат должен гибко принимать альтернативные декларации, фильтровать row-sets по author-provided predicate'ам, выражать >1 owner на сущность.

## Цель

Сделать SDK core контракт **более forgiving** (не cascade-reject на schema drift) и **более выразительный** (multi-owner, invariant.where), сохранив backward compat для всех существующих доменов.

## Design

### Fix 1.1 — Handler try/catch downgrade

**Место.** `packages/core/src/invariants/index.js` — цикл `for (const inv of invariants)` вызывает dispatched handler напрямую.

**Изменение.** Обернуть каждый handler-call в try/catch. На `TypeError` (или любом throwable'е, не `Error` с явным `kind: "violation"`) возвращать:

```js
{
  ok: false,
  violations: [{
    name: inv.name,
    kind: inv.kind,
    severity: "warning",          // downgrade от error
    message: "unknown invariant shape",
    details: { errorType: err.name, errorMessage: err.message }
  }]
}
```

Effect не откатывается, пользователь не теряет работу. Downgrade виден в логах/CrystallizeInspector.

**Альтернатива (не выбрана)**: schema validator before dispatch. Больше кода, дублирует работу handler'ов, затрудняет расширение kinds.

### Fix 1.4 — `invariant.where` для всех kinds

**Место.** `packages/core/src/invariants/{referential,aggregate,transition,cardinality}.js`. `cardinality` уже поддерживает `where` (строка-условие); остальные три — нет.

**Изменение.** Extract existing `matchesWhere` из cardinality в shared helper `invariants/_shared.js`, оставить тот же contract (object shape — exact-match filter):

```js
// _shared.js
export function matchesWhere(row, where) {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (row[k] !== v) return false;
  }
  return true;
}

export function filterByWhere(rows, where) {
  return rows.filter(r => matchesWhere(r, where));
}
```

Каждый handler первым делом применяет `filterByWhere(rows, inv.where)` и работает дальше с отфильтрованным set'ом. `cardinality` мигрирует с local `matchesWhere` на shared (behavior-preserving refactor).

**Where contract**: object `{ field: value }` для exact-match (как в текущем cardinality). **Не** JS-expression — это отдельный backlog item (§1.2 «invariant.kind: expression»). Exact-match достаточно для domain discriminator (`where: { domain: "freelance" }` если есть поле, или `where: { customerId: ... }` для filter'а по существованию fk — но здесь exact-match не покрывает `!= null`, нужен discriminator field).

**Domain-provenance.** SDK **не автогенерирует** `__domain` в row — host-responsibility (deferred в backlog §1.3). Автор добавляет discriminator-поле в ontology entity (e.g. `entity: { fields: { domain: { type: "text", default: "freelance" } } }`) и использует `where: { domain: "freelance" }`. Где нет чистого discriminator — partial fix (invariant работает не на 100% row-sets, warning'уется в Inspector).

**Альтернатива (не выбрана)**: namespace collections (`freelance.tasks` vs `lifequest.tasks`). Серьёзный host/server refactor, out of scope.

### Fix 3.2 — Multi-owner через `entity.owners`

**Место.** Два файла в SDK core:
- `packages/core/src/filterWorld.js` — viewer-scoping по owner
- `packages/core/src/crystallize_v2/assignToSlotsDetail.js` — `ownershipConditionFor` для toolbar-conditions

**Изменение онтологии (format contract).**

```js
// До (legacy, работает):
entity: { ownerField: "customerId" }

// После (V2):
entity: { owners: ["customerId", "executorId"] }
// Или всё ещё legacy — оба формата поддерживаются.
```

Новый util `packages/core/src/ontologyHelpers.js::getOwnerFields(entity)`:
```js
export function getOwnerFields(entity) {
  if (Array.isArray(entity?.owners)) return entity.owners;
  if (typeof entity?.ownerField === "string") return [entity.ownerField];
  return [];
}
```

Все callers переходят на `getOwnerFields(entity)` вместо прямого чтения `entity.ownerField`.

**`filterWorld.js` изменение.**
```js
const ownerFields = getOwnerFields(entityDef);
if (ownerFields.length > 0) {
  owned = rows.filter(r => ownerFields.some(f => r[f] === viewer.id));
}
```

**`assignToSlotsDetail.js::ownershipConditionFor` изменение.**

Current (single-owner):
```js
return ownerField ? `${ownerField} === viewer.id` : null;
```

New (multi-owner + per-intent override):
```js
// 1. intent.permittedFor override: если intent явно указывает, кто может —
//    используем только это поле, без OR всех owners.
if (intent.permittedFor) {
  const fields = Array.isArray(intent.permittedFor)
    ? intent.permittedFor
    : [intent.permittedFor];
  return fields.map(f => `${f} === viewer.id`).join(" || ");
}
// 2. Default: все owners через OR.
const ownerFields = getOwnerFields(entity);
if (ownerFields.length === 0) return null;
return ownerFields.map(f => `${f} === viewer.id`).join(" || ");
```

**Новое поле `intent.permittedFor`.**

Декларативный способ ограничить subset owners, для которых intent доступен:

```js
submit_work_result: {
  // ...
  permittedFor: "executorId",  // только исполнитель видит/executes
  particles: { ... }
}

accept_result: {
  // ...
  permittedFor: "customerId",  // только клиент
  particles: { ... }
}
```

Без `permittedFor` — default OR всех owners (любой owner видит intent в toolbar).

**Backward compat.** `entity.ownerField` (string) остаётся полностью рабочим. `getOwnerFields()` нормализует обе формы. Существующие 10 доменов не требуют миграции.

## File structure — SDK changes

```
packages/core/src/
├── invariants/
│   ├── _shared.js           [NEW] filterByWhere helper
│   ├── index.js             [MOD] try/catch + downgrade to warning
│   ├── referential.js       [MOD] apply where before check
│   ├── aggregate.js         [MOD] apply where
│   ├── transition.js        [MOD] apply where
│   └── cardinality.js       [MOD] use _shared filterByWhere (remove duplicated logic)
├── filterWorld.js           [MOD] use getOwnerFields
├── crystallize_v2/
│   └── assignToSlotsDetail.js  [MOD] multi-owner + permittedFor в ownershipConditionFor
└── ontologyHelpers.js       [MOD] export getOwnerFields util
```

## File structure — host changes (отдельный PR)

```
idf/src/domains/freelance/
├── ontology.js              [MOD] Deal.ownerField → Deal.owners
└── intents.js               [MOD] submit_work_result.permittedFor = "executorId" etc.
```

Оба PR merge-coupled: SDK publish → host bump version → host PR merge.

## Testing

### SDK core

- `invariants/index.test.js` — unknown shape в `transition` → warning, не throw, other handlers продолжают, effect не rollback'ается
- `invariants/referential.test.js` — rows filtered by `where`
- `invariants/aggregate.test.js` — rows filtered by `where`
- `invariants/transition.test.js` — rows filtered by `where`
- `invariants/cardinality.test.js` — существующие `where`-тесты продолжают работать (не регрессия), migration на `_shared` не меняет behaviour
- `ontologyHelpers.test.js` — `getOwnerFields` возвращает `[]`/`[legacy]`/`[owners...]` корректно по трём формам входа
- `filterWorld.test.js` — multi-owner entity → rows visible для **любого** из owners
- `assignToSlotsDetail.test.js` — multi-owner → OR expression; `permittedFor` → single; `permittedFor: ["A", "B"]` (array) → OR

### Интеграция

Freelance host-PR: `npm test` проходит 744+ tests (no regression). Manual: Deal visible для customer И executor, intent toolbar correct для каждого viewer'а.

## Versioning

`@intent-driven/core` — **minor** bump (backward-compat additions). Изменения:
- New export: `getOwnerFields` (utility)
- New invariant API: `where` опция для всех kinds
- New ontology field: `entity.owners` (parallel с `ownerField`)
- New intent field: `intent.permittedFor`
- Schema drift handler → warning (поведенческое изменение — invariant violation больше не откатывает effect если handler throws; domains полагавшиеся на это теряют safety, но таких не должно быть — throw был unintended behavior)

Renderer/adapter/cli — не меняются в этом PR.

## Out of scope (в backlog `docs/backlog.md`)

- **§1.2** `invariant.kind: "expression"` — custom predicate; отдельный feature.
- **§1.3** composite `groupBy` в cardinality — nice-to-have.
- **§1.3 (backlog)** `__domain` автогенерация в Φ — host server changes.
- **Cluster B** (antd adapter patches 2.1-2.4) — отдельный PR.
- **§3.1** PrimaryCTAList multi-param forms — отдельный fix.
- **Manifesto v2.1 §8 update** — формализация `entity.owners` в манифесте, отдельный doc PR когда SDK реализация стабилизируется.

## Risks

| Риск | Mitigation |
|------|-----------|
| Existing domain полагается на throw+rollback как «защиту» | Unlikely: throw был from TypeError, не semantic. Warning теперь виден в CrystallizeInspector, author может ещё обнаружить и поправить. |
| `permittedFor` + multi-owner OR-condition дают false-positive visibility | Добавить test: intent без `permittedFor` **default: все owners видят**; с `permittedFor` — только указанные. Unit-тест выше. |
| Author забыл добавить `where` для cross-domain invariant | Warning-level violation продолжает работать — видно в Inspector. Не падает silently. |
| Migration path для host `Deal.ownerField` | Legacy поддерживается параллельно. Host PR добавляет `owners` array, `ownerField` опционально удаляется. |

## Definition of done

SDK:
- [ ] All 8 test files passing (new + existing)
- [ ] `pnpm -r build` проходит
- [ ] `pnpm -r test` — 1080+ проходят без регрессий
- [ ] Changeset minor bump сгенерирован

Host (отдельный PR):
- [ ] Freelance Deal перенесён на `owners: ["customerId", "executorId"]`
- [ ] Submit/accept intents аннотированы `permittedFor`
- [ ] `npm test` проходит 744+ без регрессий
- [ ] Manual: Deal visible для обоих ролей, toolbar intents correct per viewer

End-to-end:
- [ ] Freelance customer видит Deal с `submit_work_result` **скрыт**, `accept_result` видим (permittedFor: customer)
- [ ] Freelance executor видит Deal с `submit_work_result` видим, `accept_result` **скрыт** (permittedFor: executor)
