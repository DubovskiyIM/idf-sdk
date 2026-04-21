---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

**catalog: `projection.witnesses[]` strict rendering на flat-list** (Workzilla dogfood findings P0-3, backlog §8.3).

Раньше `projection.witnesses` учитывался только в grid-layout'е (через `buildCardSpec` / `grid-card-layout` pattern). Для flat-list catalog'ов `item.children` были hardcoded в `buildCatalogBody`: avatar + title + subtitle — независимо от того, что автор задекларировал.

Теперь: если `projection.witnesses` непустой массив и `layout !== "grid"`, `item.children` генерируются из witnesses через `inferFieldRole`:

- `title`     → `{ type: "text", style: "heading" }`
- `money`/`price` → `{ type: "text", format: "currency", style: "money" }`
- `badge` (status/enum/condition) → `{ type: "badge" }`
- `heroImage` → `{ type: "avatar", size: 40 }` (уходит в row-left)
- `timer`/`deadline` → `{ type: "timer" }` (inline countdown)
- `timestamp`/`scheduled`/`occurred` → `{ type: "text", format: "datetime" }`
- `metric` → `{ type: "text", format: "number" }`
- `description` → `{ type: "text", style: "secondary" }`
- `location`/`address`/`zone` → `{ type: "text", style: "secondary" }`
- fallback → `{ type: "text" }`

**Renderer:** `Text` primitive расширен: `format: "currency"` → `n.toLocaleString("ru") + " ₽"`. `STYLE_PRESETS` получил `money` (teal weight 600). Полное vocabulary (`money-positive`/`money-negative`/`badge-*`) — на 8.5.

**Back-compat:** `projection.witnesses` пустой или не задан → legacy avatar+title+subtitle fallback. Grid-layout по-прежнему идёт через `buildCardSpec` (не заменяется).

Закрывает Workzilla-clone acceptance «`task_list.witnesses = ["title","budget","deadline","status"]` → card показывает 4 поля корректным primitive'ом».
