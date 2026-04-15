# @idf/adapter-apple

Apple visionOS-glass адаптер для `@idf/renderer`. Premium / minimal эстетика с glassmorphism-эффектами — дефолт для домена reflect (Mood Meter Yale RULER, 9 аналитических canvas, visionOS-glass shell).

**Часть экосистемы [Intent-Driven Frontend (IDF)](https://github.com/ignatdubovskiy/idf).**

## Установка

```bash
npm install @idf/adapter-apple lucide-react
# или
pnpm add @idf/adapter-apple lucide-react
```

Peer dependencies: `react@>=18`, `@idf/renderer@>=0.2.0`, `lucide-react@>=1.0`.

CSS-тема подключается явно через entry `./styles.css` (содержит backdrop-filter, blur, glass-токены).

## Использование

```jsx
import { AppleAdapterProvider } from "@idf/adapter-apple";
import "@idf/adapter-apple/styles.css";
import { ProjectionRendererV2 } from "@idf/renderer";

function App() {
  return (
    <AppleAdapterProvider>
      <ProjectionRendererV2
        artifact={artifact}
        world={world}
        exec={exec}
        projectionId="mood_feed"
      />
    </AppleAdapterProvider>
  );
}
```

## Что экспортируется

| Export | Описание |
|--------|----------|
| `AppleAdapterProvider` | Провайдер, регистрирует адаптер в реестре renderer |
| `appleAdapter` | Spec-объект адаптера (для ручной регистрации) |

CSS-тема: `@idf/adapter-apple/styles.css` (обязательный импорт хостом).

## Capabilities

```js
capabilities: {
  primitive: {
    chart: { fallback: "svg" },  // SVG fallback, glassmorphism overlay
    statistic: false,
    sparkline: false,
    map: { fallback: "svg" },
  },
  shell: { modal: true, tabs: true },
  button: { primary: true, secondary: true, danger: true, intent: true },
}
```

## Связь с IDF

Один из четырёх UI-адаптеров IDF. Glass-стилистика оптимизирована под аналитические и wellness-домены. Переключение адаптера — через `PrefsPanel ⚙ → UI-kit`.

Подробнее об архитектуре адаптеров: [manifesto §17](https://github.com/ignatdubovskiy/idf/blob/main/docs/manifesto-v1.7.md).

## Версии

[CHANGELOG.md](./CHANGELOG.md)

## Лицензия

MIT
