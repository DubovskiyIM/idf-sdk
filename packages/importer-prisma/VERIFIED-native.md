# Native-format E2E verification

**Дата:** 2026-04-21
**Ветка:** `feat/native-format`

## Что проверено

Import-generated ontology теперь кристаллизуется через `deriveProjections` + `crystallizeV2` **без ручных authored projections** — и handlers `@intent-driven/server` работают на результате.

Это закрывает известный gap из Phase G VERIFIED.md:

> Import-generated ontology использует simpler intent format (`target + alpha`), но `deriveProjections` ожидает native-format (`creates + particles`). Handler'ам нужны authored `projection`s в ontology.

## Run

```
node e2e-native.mjs
```

## Output

```
entities: [ 'User', 'Task' ]
intents count: 10
createTask has creates + particles: true true

derived projections: [
  'user_list',
  'user_detail',
  'task_list',
  'task_detail',
  'my_task_list'
]
crystallized: [
  'my_task_list',
  'task_detail',
  'task_list',
  'user_detail',
  'user_list'
]

materialize "user_list": status=200
  title: user_list
  sections: 1
```

**5 derived projections** автоматически выведены через R1-R7:

- `user_list` / `user_detail` — R1 catalog / R3 detail
- `task_list` / `task_detail` — то же для Task
- `my_task_list` — R7 owner-filter (Task.userId → owner-scoped view)

Все 5 кристаллизовались, materialize вернул 200 OK для первой.

## Что изменилось в importer'ах

Три importer'а (`importer-postgres`, `importer-openapi`, `importer-prisma`) теперь генерируют intent'ы с **двумя контрактами одновременно**:

### Legacy (для effect-runner-http)
- `target: "Task"`
- `alpha: "insert" | "replace" | "remove"`
- `parameters: {...}`

### Native IDF (для deriveProjections)
- `creates: "Task"` — для insert-intent'ов
- `particles.confirmation: "enter"` — feed-signal для created entity
- `particles.effects: [{ target, op }]` — для mutation-intent'ов (insert/replace/remove)

Читаемый intent (e.g. `listX` / `readX`) — по-прежнему только `target + parameters`, не нуждается в native-полях.

## Acceptance

| Критерий | Статус |
|---|---|
| importer-postgres генерит native-format | ✓ |
| importer-openapi генерит native-format | ✓ |
| importer-prisma генерит native-format | ✓ |
| Existing tests зелёные после изменений | ✓ (31+35+27 = 93) |
| `deriveProjections` возвращает непустой result на import-generated | ✓ |
| `crystallizeV2` строит artifacts | ✓ |
| `createDocumentHandler` → 200 OK на derived projection | ✓ |
| Backward-compat с effect-runner-http | ✓ (alpha + target сохранены) |

## Этап 3 + Phase I — полностью end-to-end

```
Prisma schema (source)
  → importPrisma()           ← Phase E
  → ontology.js (native format)  ← Phase I
  → deriveProjections()      ← @intent-driven/core (existing)
  → crystallizeV2()          ← @intent-driven/core
  → createDocumentHandler    ← Phase G
  → document-graph (HTTP 200)
```

Без человеческого редактирования ontology.js. Purely compositional.
