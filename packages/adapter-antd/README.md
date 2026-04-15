# @intent-driven/adapter-antd

Ant Design enterprise-fintech адаптер для `@intent-driven/renderer`. Dashboard / Statistic / @ant-design/plots — дефолт для домена invest (4 роли, 7 правил, 3 ML-сервиса).

**Часть экосистемы [Intent-Driven Frontend (IDF)](https://github.com/DubovskiyIM/idf).**

## Установка

```bash
npm install @intent-driven/adapter-antd antd @ant-design/plots @ant-design/icons dayjs
# или
pnpm add @intent-driven/adapter-antd antd @ant-design/plots @ant-design/icons dayjs
```

Peer dependencies: `react@>=18`, `@intent-driven/renderer@>=0.2.0`, `antd@>=5`, `@ant-design/plots@>=2`, `@ant-design/icons@>=5`.

## Использование

```jsx
import { AntdAdapterProvider } from "@intent-driven/adapter-antd";
import { ProjectionRendererV2 } from "@intent-driven/renderer";

function App() {
  return (
    <AntdAdapterProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
      <ProjectionRendererV2
        artifact={artifact}
        world={world}
        exec={exec}
        projectionId="portfolio_dashboard"
      />
    </AntdAdapterProvider>
  );
}
```

## Что экспортируется

| Export | Описание |
|--------|----------|
| `AntdAdapterProvider` | Провайдер, регистрирует адаптер в реестре renderer; принимает `theme` prop |
| `antdAdapter` | Spec-объект адаптера (для ручной регистрации) |

## Capabilities

Единственный из 4 адаптеров с полной поддержкой финансовых примитивов:

```js
capabilities: {
  primitive: {
    chart: { chartTypes: ["line", "pie", "column", "bar", "area"] },
    sparkline: true,   // мини-график тренда
    statistic: true,   // финансовая метрика с trend + prefix/suffix
    map: { fallback: "svg" },
  },
  shell: { modal: true, tabs: true },
  button: { primary: true, secondary: true, danger: true, intent: true, overflow: true },
}
```

## Связь с IDF

Один из четырёх UI-адаптеров IDF. AntD-адаптер оптимизирован для data-heavy fintech дашбордов с графиками, статистикой и enterprise-таблицами. Единственный, поддерживающий `statistic: true` и полный `chart` (без SVG-fallback).

Переключение адаптера — через `PrefsPanel ⚙ → UI-kit`.

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
