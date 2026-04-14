# @idf/adapter-antd

Ant Design enterprise-fintech UI adapter for `@idf/renderer`.

Fourth adapter in the IDF adapter suite, designed for fintech/banking dashboards (invest domain). Provides:

- Full parameter controls (text, number, select, datetime with dayjs)
- Buttons (primary, secondary, danger, intent, overflow dropdown)
- Primitives: heading, text, badge, avatar, paper (Card), **statistic** (финансовая метрика с trend), **chart** (line/pie/column/bar/area via @ant-design/plots), **sparkline**
- Shell: Modal, Tabs
- Icon resolution (emoji → @ant-design/icons)

## Usage

```jsx
import { AntdAdapterProvider } from "@idf/adapter-antd";

function App() {
  return (
    <AntdAdapterProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
      {/* your app */}
    </AntdAdapterProvider>
  );
}
```

## Capabilities

```js
capabilities: {
  primitive: {
    chart: { chartTypes: ["line", "pie", "column", "bar", "area"] },
    sparkline: true,
    statistic: true,
    ...
  },
  shell: { modal: true, tabs: true },
  button: { primary: true, secondary: true, danger: true, intent: true, overflow: true },
}
```

## License

MIT
