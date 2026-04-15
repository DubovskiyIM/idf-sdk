# @idf/adapter-shadcn

Shadcn/ui doodle-style адаптер для `@idf/renderer`. Handcrafted / sketch эстетика с Tailwind-токенами — дефолт для домена lifequest (mobile-first, BottomTabs, 6 custom canvas).

**Часть экосистемы [Intent-Driven Frontend (IDF)](https://github.com/ignatdubovskiy/idf).**

## Установка

```bash
npm install @idf/adapter-shadcn lucide-react
# или
pnpm add @idf/adapter-shadcn lucide-react
```

Peer dependencies: `react@>=18`, `@idf/renderer@>=0.2.0`, `lucide-react@>=1.0`.

Требуется Tailwind CSS в хост-приложении. CSS-тема подключается явно через entry `./styles.css`.

## Использование

```jsx
import { ShadcnAdapterProvider } from "@idf/adapter-shadcn";
import "@idf/adapter-shadcn/styles.css";
import { ProjectionRendererV2 } from "@idf/renderer";

function App() {
  return (
    <ShadcnAdapterProvider>
      <ProjectionRendererV2
        artifact={artifact}
        world={world}
        exec={exec}
        projectionId="goal_feed"
      />
    </ShadcnAdapterProvider>
  );
}
```

## Что экспортируется

| Export | Описание |
|--------|----------|
| `ShadcnAdapterProvider` | Провайдер, регистрирует адаптер в реестре renderer |
| `shadcnAdapter` | Spec-объект адаптера (для ручной регистрации) |

CSS-тема: `@idf/adapter-shadcn/styles.css` (обязательный импорт хостом).

## Capabilities

```js
capabilities: {
  primitive: {
    chart: { fallback: "svg" },  // SVG fallback
    statistic: false,
    sparkline: false,
    map: { fallback: "svg" },
  },
  shell: { modal: true, tabs: true },
  button: { primary: true, secondary: true, danger: true, intent: true },
}
```

## Связь с IDF

Один из четырёх UI-адаптеров IDF. Doodle-стилистика ориентирована на lifestyle/productivity домены. Переключение адаптера — через `PrefsPanel ⚙ → UI-kit`.

Подробнее об архитектуре адаптеров: [manifesto §17](https://github.com/ignatdubovskiy/idf/blob/main/docs/manifesto-v1.7.md).

## Версии

[CHANGELOG.md](./CHANGELOG.md)

## Лицензия

MIT
