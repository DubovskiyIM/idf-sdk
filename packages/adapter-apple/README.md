# @intent-driven/adapter-apple

Apple visionOS-glass адаптер для `@intent-driven/renderer`. Premium / minimal эстетика с glassmorphism-эффектами — дефолт для домена reflect (Mood Meter Yale RULER, 9 аналитических canvas, visionOS-glass shell).

**Часть экосистемы [Intent-Driven Frontend (IDF)](https://github.com/ignatdubovskiy/idf).**

## Установка

```bash
npm install @intent-driven/adapter-apple lucide-react
# или
pnpm add @intent-driven/adapter-apple lucide-react
```

Peer dependencies: `react@>=18`, `@intent-driven/renderer@>=0.2.0`, `lucide-react@>=1.0`.

CSS-тема подключается явно через entry `./styles.css` (содержит backdrop-filter, blur, glass-токены).

## Использование

```jsx
import { AppleAdapterProvider } from "@intent-driven/adapter-apple";
import "@intent-driven/adapter-apple/styles.css";
import { ProjectionRendererV2 } from "@intent-driven/renderer";

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

CSS-тема: `@intent-driven/adapter-apple/styles.css` (обязательный импорт хостом).

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

**MIT** (см. [LICENSE](./LICENSE)).

Адаптер транзитивно зависит от `@intent-driven/core` (через peer-dep `@intent-driven/renderer`),
который распространяется под **Business Source License 1.1**. Hosted SaaS
на базе ядра — коммерческая лицензия; некоммерческое и внутреннее
производственное использование — свободно. Change Date: 2030-04-15
(автопереход на Apache 2.0).
