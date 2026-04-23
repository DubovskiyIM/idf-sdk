---
"@intent-driven/core": minor
---

Form-архетип поддерживает `projection.bodyOverride` (G23, Keycloak Stage 5).

По образцу catalog-архетипа, author может задать authored body-node, который целиком заменяет derived formBody. Используется для замены flat-formBody на authored wizard-spec:

```js
realm_create: {
  kind: "form",
  mode: "create",
  mainEntity: "Realm",
  creatorIntent: "createRealm",
  bodyOverride: {
    type: "wizard",
    steps: [
      { id: "basic", title: "Basic info", fields: [...] },
      { id: "login", title: "Login settings", fields: [...] },
    ],
    onSubmit: { intent: "createRealm" },
  },
},
```

Без `bodyOverride` form-archetype рендерится как раньше через derived `formBody` (back-compat). Работает и в `create`, и в `edit` режимах. Пустые slot'ы (header/toolbar/context/fab/overlay) сохраняются.

Unblocks Wizard primitive для pattern `multi-step-create-wizard` (Gravitino/Keycloak): теперь authored projection может задавать step-by-step decomposition одного create-intent'а с большим количеством полей.
