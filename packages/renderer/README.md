# @intent-driven/renderer

Слой рендеринга Intent-Driven Frontend: 7 архетипов, 11 control-компонентов, примитивы (atoms / containers / chart / map / irreversibility), реестр UI-адаптеров и `ProjectionRendererV2`.

**Часть экосистемы [Intent-Driven Frontend (IDF)](https://github.com/DubovskiyIM/idf).**

## Установка

```bash
npm install @intent-driven/renderer
# или
pnpm add @intent-driven/renderer
```

Peer dependencies: `react@>=18`, `@intent-driven/core@>=0.3.0`.

Конкретный UI-kit подключается через адаптер (`@intent-driven/adapter-mantine` / `@intent-driven/adapter-shadcn` / `@intent-driven/adapter-apple` / `@intent-driven/adapter-antd`). Renderer сам по себе не импортирует ни один UI-kit.

## Использование

### Рендер проекции из артефакта

```jsx
import { ProjectionRendererV2 } from "@intent-driven/renderer";
import { AntdAdapterProvider } from "@intent-driven/adapter-antd";

function DomainView({ artifact, world, exec }) {
  return (
    <AntdAdapterProvider>
      <ProjectionRendererV2
        artifact={artifact}
        world={world}
        exec={exec}
        projectionId="task_list"
      />
    </AntdAdapterProvider>
  );
}
```

### Использование отдельных примитивов

```jsx
import { primitives } from "@intent-driven/renderer";

const { Map, IrreversibleBadge } = primitives;

// Карта с маркерами (§16a v1.7)
<Map
  layers={[
    { kind: "marker", points: [{ lat: 55.75, lng: 37.62, label: "Москва" }] },
  ]}
  width={400}
  height={300}
/>

// Маркер необратимости (§23 v1.7)
<IrreversibleBadge point="high" at="2026-04-15T12:00:00Z" reason="Платёж захвачен" />
```

### Регистрация пользовательского canvas

```js
import { registerCanvas } from "@intent-driven/renderer";

registerCanvas("order_tracker", OrderTrackerCanvas);
```

## Что экспортируется

### Верхний уровень

| Export | Описание |
|--------|----------|
| `ProjectionRendererV2` | Главный компонент — рендерит проекцию по артефакту |
| `SlotRenderer` | Рендерит один слот проекции |
| `ErrorBoundary` | React error boundary для безопасного рендера |

### Архетипы (`archetypes.*`)

7 встроенных архетипов проекций:

| Архетип | Назначение |
|---------|-----------|
| `ArchetypeFeed` | Лента записей с группировкой |
| `ArchetypeCatalog` | Каталог с фильтрацией и поиском |
| `ArchetypeDetail` | Детальная карточка сущности |
| `ArchetypeForm` | Форма создания / редактирования |
| `ArchetypeCanvas` | Произвольный canvas (расширяемый через `registerCanvas`) |
| `ArchetypeDashboard` | Дашборд с виджетами и графиками |
| `ArchetypeWizard` | Многошаговый мастер |

Дополнительные компоненты: `Composer`, `FormModal`, `ConfirmDialog`, `IntentButton`, `Overflow`, `InlineSearch`, `BulkWizard`, `Toggle`.

### Примитивы (`primitives.*`)

**Atoms:** `text`, `heading`, `badge`, `avatar`, `image`, `audio`, `spacer`, `divider`, `statBar`, `priceBlock`, `infoSection`, `timer`

**Containers:** `row`, `column`, `card`, `list`

**Специализированные:**

| Примитив | Описание |
|----------|----------|
| `chart` / `sparkline` | Графики с делегацией адаптеру; SVG-fallback встроен |
| `map` | Spatial primitive (§16a v1.7): маркеры, маршруты, полигоны, heatmap |
| `irreversibleBadge` | Визуальный маркер точки невозврата (§23 v1.7) |

Также доступны через именованные экспорты: `Chart`, `Sparkline` (из `primitives/chart.jsx`).

### Реестр адаптеров

| Export | Описание |
|--------|----------|
| `registerUIAdapter(spec)` | Регистрирует адаптер UI-kit |
| `getUIAdapter()` | Возвращает текущий активный адаптер |
| `getAdaptedComponent(kind, type)` | Разрешает компонент через адаптер с fallback |
| `getCapability(key)` | Читает capability адаптера |
| `supportsVariant(kind, variant)` | Проверяет поддержку варианта |
| `Icon` | Универсальная иконка (делегация адаптеру) |
| `labels` | Словари меток (статусы, роли и т.д.) |

### Controls (`controls.*`)

11 control-компонентов: `InlineSetter`, `ProgressWidget`, `SubCollectionSection`, `SubCollectionAdd`, `VoterSelector`, `OverlayManager`, `HeroCreate`, `capture/*` и др.

### Параметры и навигация

| Export | Описание |
|--------|----------|
| `parameters.*` | 6 типов параметров: text, number, select, date, boolean, file |
| `validateArtifact(artifact)` | Validation layer для артефактов |
| `resolve`, `template`, `evalCondition` | Утилиты вычисления значений слотов |
| `computeWitness`, `resolveParams` | Вычисление witness-of-proof и параметров |

## Связь с IDF

`@intent-driven/renderer` — адаптивный слой между канонической логикой (`@intent-driven/core`) и конкретным UI-kit:

```
@intent-driven/core  (кристаллизация + fold)
    ↓
@intent-driven/renderer  (архетипы + примитивы + реестр)
    ↓
@intent-driven/adapter-*  (конкретный UI-kit: mantine / shadcn / apple / antd)
```

Renderer **не импортирует UI-kit напрямую** — все компоненты разрешаются через `getAdaptedComponent` из реестра. Это позволяет одному домену работать с любым из 4 адаптеров без изменения кода.

Capability surface (v1.6): адаптеры декларируют `adapter.capabilities`, renderer запрашивает через `getCapability` / `supportsVariant` и применяет graceful fallback (например, SVG вместо @ant-design/plots).

## Версии

[CHANGELOG.md](./CHANGELOG.md)

## Лицензия

**MIT** (см. [LICENSE](./LICENSE)).

Примечание: этот пакет использует `@intent-driven/core` как peer-dependency.
`@intent-driven/core` распространяется под **Business Source License 1.1**
(некоммерческое + внутреннее производственное использование свободно,
hosted SaaS на базе ядра — коммерческая лицензия; автоматический переход
на Apache 2.0 — 2030-04-15). Использование `@intent-driven/renderer` в продакшн
означает также согласие с условиями BUSL-1.1 для `@intent-driven/core`.
