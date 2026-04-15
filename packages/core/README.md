# @intent-driven/core

Ядро парадигмы Intent-Driven Frontend: движок эффектов, сворачивание мира (fold), алгебра намерений, кристаллизатор v2, четыре материализации (пиксели / голос / агент / документ), инварианты, фильтрация по роли и preapproval guard.

**Часть экосистемы [Intent-Driven Frontend (IDF)](https://github.com/DubovskiyIM/idf).**

## Установка

```bash
npm install @intent-driven/core
# или
pnpm add @intent-driven/core
```

Peer dependency: `react@>=18`.

## Использование

### Базовый движок

```js
import { useEngine, crystallizeV2 } from "@intent-driven/core";

const domain = {
  DOMAIN_ID: "todo",
  INTENTS: {
    create_task: {
      label: "Создать задачу",
      particles: { effects: [{ tau: "task", alpha: "create" }] },
    },
  },
  PROJECTIONS: {
    task_list: {
      label: "Задачи",
      archetype: "feed",
      source: "task",
      slots: { title: { field: "title" } },
    },
  },
  ONTOLOGY: {
    entities: { task: { fields: { title: { type: "string" } } } },
  },
  buildEffects: (intentId, ctx, world, drafts) => [],
};

function App() {
  const { world, exec } = useEngine(domain);
  return (
    <button onClick={() => exec("create_task", { title: "Новая задача" })}>
      + Задача
    </button>
  );
}

const artifact = crystallizeV2(
  domain.INTENTS,
  domain.PROJECTIONS,
  domain.ONTOLOGY,
  domain.DOMAIN_ID,
);
```

### Фильтрация мира по роли (§5)

```js
import { filterWorldForRole } from "@intent-driven/core";

const visibleWorld = filterWorldForRole(world, ontology, "customer");
```

### Проверка инвариантов (§14)

```js
import { checkInvariants } from "@intent-driven/core";

const violations = checkInvariants(ontology, world);
if (violations.length > 0) {
  // откат через cascadeReject
}
```

### Материализация в документ (§1)

```js
import { materializeAsDocument, renderDocumentHtml } from "@intent-driven/core";

const doc = materializeAsDocument(artifact, world, "catalog");
const html = renderDocumentHtml(doc);
```

### Проверка asset-boundary (§19)

```js
import { getAssets, validateAsset, ASSET_KINDS } from "@intent-driven/core";

const assets = getAssets(ontology);
const result = validateAsset(assetDef); // { valid, errors }
```

## Что экспортируется

### Движок

| Export | Описание |
|--------|----------|
| `useEngine(domain)` | Главный React-hook; возвращает `{ world, exec, Overlay }` |

### Fold — мир из эффектов

| Export | Описание |
|--------|----------|
| `fold(effects)` | Вычисляет текущий мир из подтверждённых эффектов Φ |
| `foldDrafts(effects, drafts)` | Fold с учётом session-scoped черновиков Δ |
| `applyPresentation(world, projection)` | Применяет presentation-трансформации |
| `buildTypeMap(ontology)` | Строит карту типов из онтологии |
| `filterByStatus(effects, status)` | Фильтрует эффекты по статусу |
| `causalSort(effects)` | Топологическая сортировка по причинно-следственным связям |

### Алгебра намерений (§12)

| Export | Описание |
|--------|----------|
| `computeAlgebra(intents, world)` | Вычисляет связи ▷ ⇌ ⊕ ∥ между намерениями |
| `computeAlgebraWithEvidence(...)` | То же с доказательствами для witness-of-proof |
| `normalizeEntityFromTarget(target)` | Нормализует entity-target для алгебры |

### Кристаллизатор v2

| Export | Описание |
|--------|----------|
| `crystallizeV2(intents, projections, ontology, domainId)` | Строит артефакт (7 архетипов) |
| `validateArtifact(artifact)` | Проверяет корректность артефакта |
| `generateEditProjections(ontology)` | Генерирует edit-проекции для всех сущностей |
| `findReplaceIntents(intents, entityType)` | Находит replace-намерения для формы |
| `buildFormSpec(intent, ontology)` | Строит спецификацию формы из намерения |
| `registerArchetype(name, fn)` | Регистрирует пользовательский архетип |
| `prependArchetype(name, fn)` | Добавляет архетип в начало registry |
| `selectArchetype(artifact, projection)` | Выбирает подходящий архетип |
| `getArchetypes()` | Возвращает все зарегистрированные архетипы |

### Материализации (§1)

| Export | Описание |
|--------|----------|
| `materializeAsDocument(artifact, world, projId)` | Document-материализация (§1 4-я) |
| `renderDocumentHtml(doc)` | HTML из document-графа |
| `materializeAsVoice(artifact, world, projId)` | Voice-материализация (§1 3-я) |
| `renderVoiceSsml(voiceDoc)` | SSML для TTS |
| `renderVoicePlain(voiceDoc)` | Plain text для отладки |

### Фильтрация по роли (§5)

| Export | Описание |
|--------|----------|
| `filterWorldForRole(world, ontology, roleId)` | Viewer-scoping с m2m через role.scope |
| `BASE_ROLES` | Словарь базовых ролей: owner / viewer / agent / observer |
| `validateBase(base)` | Проверяет корректность base-значения |
| `getRolesByBase(ontology, base)` | Возвращает роли с заданной base |
| `isAgentRole(role)` | Проверяет, является ли роль агентской |
| `isObserverRole(role)` | Проверяет наблюдательную роль |
| `isOwnerRole(role)` | Проверяет роль владельца |
| `auditOntologyRoles(ontology)` | Аудит аннотаций ролей домена |

### Preapproval guard (§17)

| Export | Описание |
|--------|----------|
| `checkPreapproval(intent, ctx, world, preapprovalDef)` | Проверяет 5 типов предикатов для agent-лимитов |

### Инварианты (§14)

| Export | Описание |
|--------|----------|
| `checkInvariants(ontology, world)` | Проверяет schema-level ∀-свойства мира |
| `registerKind(kind, handler)` | Регистрирует обработчик нового вида инварианта |
| `KIND_HANDLERS` | Встроенные обработчики: role-capability, referential, transition, cardinality, aggregate |

### Необратимость (§23)

| Export | Описание |
|--------|----------|
| `mergeIntoContext(context, irrDef)` | Добавляет `__irr` к контексту эффекта |

### Asset-boundary (§19)

| Export | Описание |
|--------|----------|
| `ASSET_KINDS` | Перечень допустимых видов внешних активов |
| `getAssets(ontology)` | Возвращает `ontology.assets[]` |
| `validateAsset(asset)` | Валидирует декларацию актива |

### Прочее

| Export | Описание |
|--------|----------|
| `checkComposition(intents)` | Проверяет корректность composition-алгебры |
| `checkIntegrity(world, ontology)` | Integrity rules (referential, state machine) |
| `parseCondition(expr)` / `parseConditions(exprs)` | Парсер условных выражений |
| `PARTICLE_COLORS`, `ALPHA_LABELS`, `LINK_COLORS` | Визуальные константы для графа намерений |
| `SLOT_STATUS_COLORS`, `BOOKING_STATUS_COLORS` | Константы статусов |

## Связь с IDF

`@intent-driven/core` — канонический пакет парадигмы. Все остальные пакеты экосистемы зависят от него:

- **`@intent-driven/renderer`** использует `crystallizeV2`, `fold`, `computeAlgebra` для рендера
- **`@intent-driven/adapter-*`** получают capability surface от renderer, а не от core напрямую
- **`@intent-driven/canvas-kit`** — автономен, peer только `react`
- **Server-слой** (`server/schema/*.cjs` в основном репо) — thin re-exports из core для CJS-совместимости

Манифест IDF v1.7: [docs/manifesto-v1.7.md](https://github.com/DubovskiyIM/idf/blob/main/docs/manifesto-v1.7.md)

## Версии

[CHANGELOG.md](./CHANGELOG.md)

`0.x` — нестабильный API, breaking changes возможны без bump major. После 2–3 успешных продакшн-интеграций → `1.0.0`.

## Лицензия

**Business Source License 1.1 (BUSL-1.1).**

Коротко:
- Некоммерческое использование, обучение, исследования — свободно.
- Внутреннее корпоративное использование и разработка ваших собственных
  приложений на базе `@intent-driven/core` (которые вы распространяете своим
  конечным пользователям) — свободно.
- Hosted SaaS / PaaS, где третьи лица строят приложения поверх
  `@intent-driven/core` **без установки собственного экземпляра**, требует
  коммерческой лицензии от Licensor до Change Date.
- **Change Date:** 2030-04-15 (через 4 года от первой публикации).
  После этой даты пакет автоматически конвертируется в Apache License 2.0.

Полный текст: [LICENSE](./LICENSE). Вопросы по коммерческой лицензии —
issue в репозитории или email указанный в `author`.

Клиентские пакеты экосистемы (`@intent-driven/renderer`, `@intent-driven/adapter-*`,
`@intent-driven/canvas-kit`) распространяются под MIT, но используют `@intent-driven/core`
как peer-dependency — их потребители также соглашаются с условиями
BUSL-1.1 для `@intent-driven/core` до Change Date.
