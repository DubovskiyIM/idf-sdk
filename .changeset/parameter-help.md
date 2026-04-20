---
"@intent-driven/renderer": minor
---

feat(parameter): `parameter.help` — contextual hint под параметром (UI-gap #7, Workzilla-style).

Декларация inline hint-card:

```js
{ name: "budget", type: "number", fieldRole: "price",
  help: {
    title: "Какую стоимость поставить?",
    text: "Укажите стоимость, которую готовы заплатить за задание. Важно, чтобы цена соответствовала объёму работы.",
    icon: "💡",  // опц., дефолт "💡"
  },
}
```

Shortcut: `help: "строка"` → treated as `{ text: "строка" }`.

Renderer: ParameterControl оборачивает Component + optional PresetChips + optional HelpCard. HelpCard — compact card с `role="note"` под input (+ presets если есть).

CSS vars: `--idf-surface-soft` / `--idf-accent-soft` / `--idf-text` / `--idf-text-muted` через Token Bridge — автоматически вписывается в 4 UI-kit'а.

Side-card layout (floating справа от form'ы, как в workzilla-create-task-form) — follow-up, требует form-layout awareness в ArchetypeForm.

Тесты: +9 в `HelpCard.test.jsx` (6 unit + 3 ParameterControl integration). 194 renderer passing.
