# Changelog

## 0.1.1 — 2026-04-15

### Changed

- Обновлена peerDependency `@intent-driven/renderer` до `>=0.2.0` (поддержка map primitive и IrreversibleBadge)

---

## 0.1.0 — 2026-04-14

- Первый релиз enterprise-fintech адаптера для `@intent-driven/renderer`
- AntD v6 + @ant-design/plots v2 + @ant-design/icons v6
- Компоненты: parameter (text/number/select/datetime), button (primary/secondary/danger/intent/overflow), primitive (heading/text/badge/avatar/paper/statistic/chart/sparkline), shell (modal/tabs)
- `AntdAdapterProvider` с `ConfigProvider` и авто-регистрацией адаптера
- Capability surface: `primitive.chart.chartTypes`, `primitive.statistic`, `primitive.sparkline`
- Четвёртый адаптер в линейке IDF (Mantine / shadcn / Apple visionOS-glass / AntD)
