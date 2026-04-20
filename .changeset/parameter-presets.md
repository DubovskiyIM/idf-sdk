---
"@intent-driven/renderer": minor
---

feat(parameter): `parameter.presets` — quick-value chips (UI-gap #3, Workzilla-style).

Авторы могут декларировать быстрые значения на параметре:

```js
{ name: "budget", type: "number", fieldRole: "price",
  presets: [
    { label: "500 ₽", value: 500 },
    { label: "1500 ₽", value: 1500 },
    { label: "5000 ₽", value: 5000 },
  ],
}
```

Или shortcut form (preset as plain value, label = String(value)):

```js
{ name: "retries", type: "number", presets: [1, 3, 5, 10] }
```

Renderer: ParameterControl оборачивает Component + PresetChips (ряд кликабельных button'ов под input'ом). Click на chip → `onChange(preset.value)`. Active-state подсвечивается когда текущий value совпадает с preset.value (aria-pressed).

Preset-capable control types: `text` / `email` / `tel` / `url` / `number` / `datetime`. File / image / multiImage — skip (нет "значения" в обычном смысле).

PresetChips использует Token Bridge CSS vars (`--idf-accent` / `--idf-surface-soft` / `--idf-text-muted` / `--idf-border`) — корректно вписывается в 4 UI-kit'а.

Мотивация: скриншоты Workzilla — quick-chip'ы "Через 2 часа / 6 часов" на deadline, "500 / 1500" на budget. 8 тестов (`PresetChips.test.jsx`).
