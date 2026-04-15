# @idf/canvas-kit

Низкоуровневые SVG math/layout утилиты для кастомных canvas в IDF-доменах: оси, пути, heatmap, zoom/pan, drag, кластеры, календарная сетка.

**Часть экосистемы [Intent-Driven Frontend (IDF)](https://github.com/ignatdubovskiy/idf).**

## Установка

```bash
npm install @idf/canvas-kit
# или
pnpm add @idf/canvas-kit
```

Peer dependency: `react@>=18`. Нет зависимостей от UI-kit — пакет полностью автономен.

## Использование

```js
import {
  makeSvgScale,
  axisTicks,
  pointsToPath,
  heatmapColorScale,
  useTooltipPosition,
  useDraggablePoint,
  useZoomPan,
  clusterLayout,
  calendarGrid,
} from "@idf/canvas-kit";

// Построить SVG-шкалу для оси X
const xScale = makeSvgScale({ domain: [0, 100], range: [0, 400] });

// Вычислить деления оси
const ticks = axisTicks({ min: 0, max: 100, count: 5 });

// Построить SVG path из массива точек
const path = pointsToPath([{ x: 0, y: 50 }, { x: 100, y: 20 }, { x: 200, y: 80 }]);

// Цвет ячейки heatmap по значению
const color = heatmapColorScale(0.75, { low: "#eef", high: "#00c" });

// Хук для позиции тултипа внутри SVG
const { tooltipStyle, onMouseMove } = useTooltipPosition();

// Хук для перетаскиваемой точки на canvas
const { pos, bind } = useDraggablePoint({ initial: { x: 50, y: 50 } });

// Хук для zoom + pan SVG viewport
const { viewBox, onWheel, onMouseDown } = useZoomPan({ width: 600, height: 400 });

// Layout кластеров точек
const clusters = clusterLayout(points, { radius: 30 });

// Сетка календаря (недели × дни)
const grid = calendarGrid({ year: 2026, month: 3 });
```

## Что экспортируется

| Export | Тип | Описание |
|--------|-----|----------|
| `makeSvgScale(opts)` | утилита | Линейная SVG-шкала: domain → range |
| `axisTicks(opts)` | утилита | Вычисляет деления оси (min, max, count) |
| `pointsToPath(points)` | утилита | Массив `{x,y}` → SVG d-строка |
| `heatmapColorScale(value, colors)` | утилита | Интерполяция цвета по нормализованному значению |
| `useTooltipPosition()` | хук | Позиция тултипа относительно SVG-контейнера |
| `useDraggablePoint(opts)` | хук | Перетаскиваемая точка на canvas |
| `useZoomPan(opts)` | хук | Zoom + pan для SVG viewport |
| `clusterLayout(points, opts)` | утилита | Группировка близких точек в кластеры |
| `calendarGrid(opts)` | утилита | Матрица недель/дней для calendar canvas |

## Связь с IDF

`@idf/canvas-kit` используется при создании кастомных canvas в архетипе `ArchetypeCanvas`. Применяется в доменах lifequest (6 canvas), reflect (6 canvas), delivery (3 map-canvas). Пакет не зависит от `@idf/core` или `@idf/renderer` — подключается напрямую в canvas-компонентах.

Подробнее о canvas-архетипе: [manifesto §16a](https://github.com/ignatdubovskiy/idf/blob/main/docs/manifesto-v1.7.md).

## Версии

Текущая версия: `0.1.0`. Изменений нет — CHANGELOG не публикуется.

## Лицензия

MIT
