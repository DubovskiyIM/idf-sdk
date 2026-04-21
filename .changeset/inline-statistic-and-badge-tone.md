---
"@intent-driven/renderer": minor
---

**Inline primitives `statistic` / `countdown` + `Badge` toneMap/toneBind** (Workzilla findings P1-1 / P1-3, backlog §8.4 / §8.6).

**8.4 — Inline primitives:**

- Новый primitive `Statistic` (atoms.jsx): `{title, prefix, suffix, bind, precision, size}`. Delegates в `getAdaptedComponent("primitive","statistic")` (AntD-адаптер уже предоставляет AntdStatistic); fallback — inline div с title/value/prefix/suffix/uppercase-label.
- Зарегистрирован в `PRIMITIVES.statistic` — теперь работает inline внутри `card.children` / `column.children`, раньше падал в "Unknown type".
- `PRIMITIVES.countdown = Timer` — alias для семантической ясности (`{type:"countdown", bind:"deadline"}` vs `{type:"timer"}`).

**8.6 — Badge toneMap/toneBind:**

`Badge` primitive расширен tone-резолвером:

```js
{ type: "badge", bind: "status", toneMap: { draft: "neutral", published: "success" } }
{ type: "badge", bind: "status", toneBind: "_tone" } // tone берётся из item._tone
```

Приоритет: `node.color` → `toneMap[rawVal]` → `toneBind`-resolve → адаптер-fallback.

Fallback-рендер (без адаптера) имеет mapping tone → colors: `success` (зелёный), `warning` (оранжевый), `danger` (красный), `info` (голубой), `neutral` (серый), `default` (индиго). AntD/Mantine Badge получает `color={tone}` и маппит в свои цветовые роли.

Закрывает: «все статусы в Workzilla показывают разные цвета без client-side augment'а».

Тесты: 10 новых unit (Badge toneMap/toneBind happy-path + explicit color priority + unknown value fallback; Statistic render с title/prefix/suffix). Renderer suite: 287 → 297.
