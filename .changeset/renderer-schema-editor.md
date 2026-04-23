---
"@intent-driven/renderer": minor
---

Новый primitive `SchemaEditor` — render/edit списка column-определений с composite parametric types.

**Shape value** (array of column defs):
```js
[
  { name: "id",      type: "bigint",  nullable: false, comment: "primary key" },
  { name: "email",   type: "varchar", length: 320 },
  { name: "balance", type: "decimal", precision: 10, scale: 2 },
  { name: "ts",      type: "timestamp", nullable: false },
]
```

**Поддерживаемые types:** `string`, `varchar(N)`, `char(N)`, `text`, `integer`, `bigint`, `smallint`, `tinyint`, `decimal(P,S)`, `float`, `double`, `boolean`, `timestamp`, `date`, `time`, `binary`. Parametric types показывают доп. inputs для N/P/S.

**Modes:** read-only (table с bold names + code-badge types) vs edit (text inputs + select + parametric numbers + add/remove-row buttons).

**Адаптерная делегация:** `ctx.adapter.getComponent("primitive", "schemaEditor")` — если адаптер даёт component, delegate'ится. Иначе built-in minimal table UI.

**Scope intentional:** primitive-level + тесты. Composite nested types (`list<T>`, `map<K,V>`, `struct<...>`, `union`) — future work; требуют nesting UI с expand/collapse. Host-integration (use в archetype-form когда field имеет column-schema role) — отдельный host PR.

**Обнаружено:** Gravitino dogfood-спринт Stage 3 — Table entity имеет `columns: type: "json"` (array из column defs с varchar(N)/decimal(P,S) типами). Default renderer показывает JSON blob; SchemaEditor даёт structured view.

**Tests:** +16 unit (read-only rendering: bigint/varchar/decimal parametric display, edit-mode: name/type/params/nullable/comment inputs, add/remove rows, invalid row filtering, adapter delegation). 320/320 renderer pass.
