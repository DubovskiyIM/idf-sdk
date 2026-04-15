# @intent-driven/adapter-shadcn

Shadcn/ui doodle-style адаптер для `@intent-driven/renderer`. Handcrafted / sketch эстетика с Tailwind-токенами — дефолт для домена lifequest (mobile-first, BottomTabs, 6 custom canvas).

**Часть экосистемы [Intent-Driven Frontend (IDF)](https://github.com/DubovskiyIM/idf).**

## Установка

```bash
npm install @intent-driven/adapter-shadcn lucide-react
# или
pnpm add @intent-driven/adapter-shadcn lucide-react
```

Peer dependencies: `react@>=18`, `@intent-driven/renderer@>=0.2.0`, `lucide-react@>=1.0`.

Требуется Tailwind CSS в хост-приложении. CSS-тема подключается явно через entry `./styles.css`.

## Использование

```jsx
import { ShadcnAdapterProvider } from "@intent-driven/adapter-shadcn";
import "@intent-driven/adapter-shadcn/styles.css";
import { ProjectionRendererV2 } from "@intent-driven/renderer";

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

CSS-тема: `@intent-driven/adapter-shadcn/styles.css` (обязательный импорт хостом).

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

Подробнее об архитектуре адаптеров: [manifesto §17](https://github.com/DubovskiyIM/idf/blob/main/docs/manifesto-v1.7.md).

## Версии

[CHANGELOG.md](./CHANGELOG.md)

## Лицензия

**MIT** (см. [LICENSE](./LICENSE)).

Адаптер транзитивно зависит от `@intent-driven/core` (через peer-dep `@intent-driven/renderer`),
который распространяется под **Business Source License 1.1**. Hosted SaaS
на базе ядра — коммерческая лицензия; некоммерческое и внутреннее
производственное использование — свободно. Change Date: 2030-04-15
(автопереход на Apache 2.0).
