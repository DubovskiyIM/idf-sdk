---
"@intent-driven/renderer": minor
---

feat(parameter): `control: "methodSelect"` — radio-card grid с группами (UI-gap #4, Workzilla-style payment-method selector).

Новый built-in control type `methodSelect`. Рендерит grid кликабельных radio-card'ов с icon + label + sublabel, группированных по `option.group`.

```js
{
  name: "method",
  control: "methodSelect",
  label: "Способ оплаты",
  options: [
    { id: "kassa",  label: "Мир/Visa/Mastercard", sublabel: "Kassa",
      icon: "💳", group: "Банковская карта" },
    { id: "sbp",    label: "СБП", sublabel: "Система быстрых платежей",
      icon: "⚡",  group: "Банковская карта" },
    { id: "paypal", label: "PayPal", icon: "💰",
      group: "Электронные деньги" },
    { id: "stripe", label: "Visa/Mastercard", sublabel: "Stripe",
      icon: "💳", group: "Другое" },
  ],
}
```

### Поведение

- Grid с `auto-fill, minmax(220px, 1fr)` — адаптивный layout.
- Группы отрисовываются как отдельные секции с header; header скрывается для unlabeled group.
- Порядок групп — по первому появлению в options (stable).
- Accessibility: `role="radiogroup"` / `role="radio"` / `aria-checked`.
- Click → `onChange(option.id)`.
- Active-state подсвечивается через `--idf-accent` / `--idf-accent-soft`.

### Token Bridge

`--idf-accent` / `--idf-accent-soft` / `--idf-surface-soft` / `--idf-text` / `--idf-text-muted` / `--idf-danger` — согласованно в 4 UI-kit'ах.

### Тесты

+8 тестов в `MethodSelectControl.test.jsx`. 230 renderer passing.

### Применение

Workzilla-style wallet top-up (скриншот 3: Банковская карта / Электронные деньги / Другое). Freelance `top_up_wallet_by_card.parameters.method: { control: "methodSelect", options: [...] }`.
