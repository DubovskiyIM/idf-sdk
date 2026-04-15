# @idf/adapter-mantine

Mantine-адаптер для `@idf/renderer`. Корпоративный data-dense стиль — дефолт для доменов booking, planning, workflow, messenger, meshok.

**Часть экосистемы [Intent-Driven Frontend (IDF)](https://github.com/ignatdubovskiy/idf).**

## Установка

```bash
npm install @idf/adapter-mantine @mantine/core @mantine/dates lucide-react
# или
pnpm add @idf/adapter-mantine @mantine/core @mantine/dates lucide-react
```

Peer dependencies: `react@>=18`, `@idf/renderer@>=0.2.0`, `@mantine/core@>=9`, `@mantine/dates@>=9`, `lucide-react@>=0.400.0`.

CSS-файлы `@mantine/core/styles.css` и `@mantine/dates/styles.css` импортируются провайдером автоматически.

## Использование

```jsx
import { MantineAdapterProvider } from "@idf/adapter-mantine";
import { ProjectionRendererV2 } from "@idf/renderer";

function App() {
  return (
    <MantineAdapterProvider>
      <ProjectionRendererV2
        artifact={artifact}
        world={world}
        exec={exec}
        projectionId="booking_list"
      />
    </MantineAdapterProvider>
  );
}
```

## Что экспортируется

| Export | Описание |
|--------|----------|
| `MantineAdapterProvider` | Провайдер, регистрирует адаптер в реестре renderer |
| `mantineAdapter` | Spec-объект адаптера (для ручной регистрации) |

## Capabilities

```js
capabilities: {
  primitive: {
    chart: { fallback: "svg" },  // SVG fallback, нет @ant-design/plots
    statistic: false,
    sparkline: false,
    map: { fallback: "svg" },
  },
  shell: { modal: true, tabs: true },
  button: { primary: true, secondary: true, danger: true, intent: true, overflow: true },
}
```

## Связь с IDF

Один из четырёх UI-адаптеров IDF. Выбор адаптера меняется через `PrefsPanel ⚙ → UI-kit` в рантайме — домен не меняется.

Подробнее об архитектуре адаптеров: [manifesto §17](https://github.com/ignatdubovskiy/idf/blob/main/docs/manifesto-v1.7.md).

## Версии

[CHANGELOG.md](./CHANGELOG.md)

## Лицензия

MIT
