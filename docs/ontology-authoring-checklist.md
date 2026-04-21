# Ontology Authoring Checklist

Список вещей, которые **автор онтологии** должен явно указать, чтобы Workzilla/freelance-подобный scaffold произвёл полноценный UI (а не read-only с raw-лейблами).

Источник — Workzilla-clone dogfood 2026-04-21 после SDK 0.50 bump'а. Часть проблем решаема в SDK (см. backlog §9) — остальное остаётся авторской ответственностью.

## 1. Canonical types в `entity.fields[*].type`

IDF-canonical type vocabulary (используется `inferControlType` / `mapOntologyTypeToControl`):

| canonical  | описание                                  | не писать       |
|------------|-------------------------------------------|-----------------|
| `text`     | короткая строка                           | ~~`string`~~    |
| `textarea` | длинный текст (description / bio / notes) |                 |
| `email`    | email-адрес                               |                 |
| `tel`      | телефон                                   |                 |
| `url`      | URL                                       |                 |
| `number`   | число                                     | ~~`int/float`~~ |
| `datetime` | дата+время                                |                 |
| `date`     | только дата                               |                 |
| `boolean`  | флаг                                      |                 |
| `enum`     | фиксированный набор значений              |                 |
| `entityRef`| ссылка на сущность (FK-поле)              |                 |
| `image`    | одна картинка                             |                 |
| `multiImage`| массив картинок                          |                 |
| `file`     | файл                                      |                 |
| `coordinate` | lat/lng                                 |                 |

`type: "string"` в parameters → validator эмитит `unknown parameter control type: "string"`. SDK normalize покрывает частично (см. §8.1), но полный coverage — на ответственности автора.

## 2. Семантические роли — `fieldRole`, не `role`

```js
budget: { type: "number", fieldRole: "money", ... }  // ✅
budget: { type: "number", role: "money", ... }        // ❌ — inferFieldRole игнорирует
```

Canonical `fieldRole` values (из `inferFieldRole`):
- `title` / `description` / `price` / `money`
- `heroImage` / `badge` / `timer` / `deadline`
- `location` / `address` / `zone` / `coordinate`
- `metric` / `info` / `ref`
- `timestamp` / `scheduled` / `occurred`

Без `fieldRole: "money"` число рендерится как plain number (без ₽). Без `heroImage` — image не становится avatar.

## 3. FK-поля — `entityRef + entity`, не `text`

```js
// ❌ categoryId рендерится как text-инпут, users должен набирать id вручную
categoryId: { type: "text", required: true }

// ✅ categoryId → select с options из world.categories
categoryId: { type: "entityRef", entity: "Category", required: true }
```

Плюс декларируй в `entity.relations` для R9 composition auto-resolve:
```js
Task: {
  relations: { categoryId: { entity: "Category", kind: "belongs-to" } }
}
```

## 4. Labels на каждом поле

`inferFieldRole` делает лейблы из имён только эвристически. Для пользовательского UI добавь явные `label`:

```js
title: { type: "text", required: true, label: "Название" },
budget: { type: "number", fieldRole: "money", label: "Бюджет" },
categoryId: { type: "entityRef", entity: "Category", label: "Категория" },
```

Без `label` форма показывает английские raw-имена (`title / budget / categoryId`).

## 5. `enum` с `valueLabels`

```js
status: {
  type: "enum",
  values: ["draft", "published", "closed"],
  valueLabels: { draft: "Черновик", published: "Опубликовано", closed: "Закрыто" },
  label: "Статус",
}
```

Без `valueLabels` badge показывает `DRAFT / PUBLISHED` (raw uppercase).

## 6. `detail`-projection нуждается в явном `idParam`

`deriveProjections` **не ставит** `idParam` на standalone detail-projections (только на parent-FK scoped). Для ArchetypeDetail чтобы резолвить target из `routeParams`, нужно явно:

```js
projections: {
  task_detail: {
    kind: "detail",
    mainEntity: "Task",
    idParam: "taskId",  // ← обязательно
    witnesses: [...],
  }
}
```

Convention: `<entityLower>Id`.

Для singleton-detail (owner-scoped, без targetId):
```js
my_wallet_detail: { kind: "detail", mainEntity: "Wallet", singleton: true, ... }
```

## 7. `list / catalog`-projection — authored `onItemClick`

`deriveProjections` эмитит `onItemClick` из nav-graph, но при нескольких `item-click` edges выбирает первый попавшийся — часто не тот detail. **Явно укажи**:

```js
task_list: {
  kind: "catalog",
  mainEntity: "Task",
  witnesses: [...],
  onItemClick: {
    action: "navigate",
    to: "task_detail",
    params: { taskId: "item.id" },
  },
}
```

## 8. Семантическая группировка — authored projections, не flat-list

Workzilla-error: 25 projections во flat top-nav (включая detail/create). Правильно:
- **Top-nav**: только root-проекции (catalog/feed/dashboard без `idParam`, без `_create/_edit`).
- **detail/_create** открываются через `onItemClick` / CTA.
- **singleton-detail** (wallet, profile) — subCollection c транзакциями + toolbar с action'ами.

Пример wallet grouping:
```js
my_wallet_detail: {
  kind: "detail",
  mainEntity: "Wallet",
  singleton: true,
  witnesses: ["balance", "reserved", "currency"],
  subCollections: [
    { projectionId: "my_transaction_list", foreignKey: "walletId", entity: "Transaction", title: "История операций" },
  ],
}
// + topUpWallet / withdrawFromWallet intents autoматически попадают в toolbar.
```

## 9. `forRoles` для role-aware navigation

Если projection должна видеться только конкретным ролям:
```js
my_response_list: {
  kind: "catalog",
  mainEntity: "Response",
  forRoles: ["executor", "admin"],  // customer не увидит в top-nav
}
```

`filterProjectionsByRole(projIds, projs, activeRole)` в SDK core фильтрует по этому полю.

## 10. Compositions для dotted-witness'ов

Dotted witnesses (`customer.name`, `task.title`) работают только когда R9 composition объявлена:

```js
compositions: {
  Task: [
    { entity: "Category", as: "category", via: "categoryId", mode: "one" },
    { entity: "User",     as: "customer", via: "customerId", mode: "one" },
    { entity: "Response", as: "responses", via: "taskId",    mode: "many" },
  ]
}
```

Иначе `{bind: "customer.name"}` рендерится как `undefined` — eval.js не знает откуда взять.

## 11. Host integration — передай все props в `<ProjectionRendererV2>`

```jsx
<ProjectionRendererV2
  artifact={currentArtifact}
  projection={currentProjectionDef}   // ← не только artifact!
  world={world}
  viewer={user}
  viewerContext={{ role: viewerRole, ...user }}
  routeParams={routeParams}           // ← state, mutated via navigate()
  exec={(intent, params) => run(intent, params)}
  navigate={(projId, params) => { /* set currentProjection + routeParams */ }}
  back={() => /* pop nav-stack */}
  artifacts={artifacts}
  allProjections={allProjections}
/>
```

Без `projection` prop ArchetypeForm падает на `projection.name`. Без `routeParams/navigate/back` — item-click не работает, form-save не возвращает назад.

Synthesized projections (`task_create`, `task_edit` — из `generateCreateProjections` / `generateEditProjections`) не попадают в host'овский `allProjections` (они создаются **внутри** `crystallizeV2`). Используй fallback:

```js
const projDef = allProjections[id] || (artifact ? {
  name: artifact.name,
  kind: artifact.archetype,
  mainEntity: artifact.slots?.body?.mainEntity,
  mode: artifact.slots?.body?.mode,
  creatorIntent: artifact.slots?.body?.creatorIntent,
  idParam: artifact.slots?.body?.idParam,
} : null);
```

## 12. Intent `confirmation` и `name`

- `confirmation: "form"` для multi-param creator → formModal, попадает в toolbar через `catalog-creator-toolbar`.
- `confirmation: "enter"` — только для single-text-param creator'ов (heroCreate).
- `confirmation: "click"` — instant-action button (phase-transition на 1 id-param).
- `name: "Создать задачу"` — RU-лейбл для кнопки/формы. Без `name` — используется `intentId` как заголовок.

---

## Минимальная корректность

Чек перед `crystallizeV2`:
- [ ] Все `type` — из canonical vocabulary (нет `"string"`).
- [ ] Все money/price поля имеют `fieldRole: "money"`.
- [ ] Все FK-поля имеют `type: "entityRef", entity: "X"` + `entity.relations[fk]`.
- [ ] Все user-visible поля имеют `label:"..."`.
- [ ] Все `enum` имеют `valueLabels: {...}`.
- [ ] Все `detail`-projections имеют `idParam:"<entity>Id"` или `singleton:true`.
- [ ] Все `list`-projections c item-click имеют authored `onItemClick`.
- [ ] Есть `compositions` для каждого dotted-witness (`x.name / x.title`).
- [ ] `forRoles` где нужна role-specific nav.
- [ ] Host передаёт `projection`, `routeParams`, `exec`, `navigate`, `back` в renderer.

## См. также

- `sdk-improvements-backlog.md §9` — то что **должно** быть в SDK (bridge, auto-idParam, onItemClick smarter routing).
- `docs/quickstart.md` — happy path scaffolding.
