---
"@intent-driven/renderer": minor
---

`TabbedForm` primitive для enterprise-config UI (P-K-A Keycloak Stage 6).

Form-архетип теперь поддерживает `bodyOverride.type === "tabbedForm"` — декомпозиция одной большой формы на семантические tabs с per-tab save. UX отличается от Wizard: tabs — free-form navigation, каждый tab имеет свой `onSubmit.intent` (или shared), values persist между переключениями.

Typical use:
- Keycloak Client settings (10 tabs × 30+ полей)
- Keycloak Realm general config
- AWS IAM role config
- K8s Deployment YAML as semantic tabs

## Shape

```js
projection.bodyOverride = {
  type: "tabbedForm",
  tabs: [
    {
      id: "settings",
      title: "Settings",
      fields: [...],
      onSubmit: { intent: "updateClient", label: "Сохранить" },
    },
    { id: "flow", title: "Client type", fields: [...], onSubmit: { intent: "updateClient" } },
  ],
  initialTab: "settings",  // optional, default — первая
  value: { ... }           // optional initial form-state, target-entity fields fill прочее
};
```

## Поведение

- Dirty-tracking per-tab — Save disabled пока tab не edited
- Values persist между переключениями (пользователь может free-form navigate)
- Save вызывает `ctx.exec(activeTab.onSubmit.intent, { ...activeValues, id: target.id })`
- Tab без `onSubmit.intent` — view-only (save не показывается)
- Пустые `fields` — placeholder message
- Target-overlay initial values: `target[field.name]` → `values[field.name]` если не override'нуто `node.value`

## Integration

`ArchetypeForm` проверяет `body.type === "tabbedForm"` и делегирует в `TabbedForm` primitive. Без `bodyOverride` — back-compat flat formBody. 

## Тесты

`TabbedForm.test.jsx` — 11 новых:
- Рендер tabs + начальная активная
- Tab switching показывает fields другого tab'а
- Required-маркер
- initialTab option
- Пустой tabs / пустые fields / без onSubmit
- Dirty tracking + exec payload
- Save clears dirty per tab
- Values persist между tab-switch
- Target-overlay начальных значений (+ node.value приоритет)

`@intent-driven/renderer`: **460 passed** (было 449, +11).

## Follow-up

- Pattern `tabbed-form-sections` в core — автоматическое apply по name-pattern (`Client.detail` с >30 полей → discover `settings` / `flow` / `urls` tabs). Сейчас только authored-путь
- `core` — сохранение `bodyOverride` для `archetype: "detail"` тоже (сейчас только catalog / form)
