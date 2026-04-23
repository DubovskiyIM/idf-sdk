---
"@intent-driven/renderer": minor
---

Новый primitive `Wizard` — multi-step form с provider/discriminator-dependent шагами и async `test-connection` action.

**Shape:**
```js
{
  type: "wizard",
  steps: [
    { id: "type", title: "Type", fields: [...] },
    { id: "provider", title: "Provider", fields: [...], dependsOn: { type: "relational" } },
    { id: "config", title: "Config", fields: [...], testConnection: { intent: "testConnection", label?: "Test Connection" } },
  ],
  value: {},
  onSubmit: (values) => ...,
}
```

**Фичи v1:**
- **Progress bar** с номерами шагов + labels сверху. Completed/current/upcoming — разные стили.
- **Step navigation**: Next / Back / Submit buttons. Back disabled на первом; Submit на последнем.
- **dependsOn conditions**: `dependsOn: { type: "relational" }` — шаг появляется только когда ВСЕ conditions match current values. Иначе пропускается (не в progress + не доступен navigation'ом).
- **Fields rendering**: text / textarea / number / boolean / select с options. Required marker `*`. Hint text под полем.
- **test-connection control** (optional per-step): button с async validation → ctx.testConnection(intent, values): Promise<{ok, message}>. Inline states: idle / loading / ok / error.
- **Label accessibility**: `<label htmlFor>` + input `id` (prefix `wz-field-`) — form-control а11y.
- **Adapter delegation**: `ctx.adapter.getComponent("primitive", "wizard")`.

**Use-case:** Gravitino Catalog creation wizard (G23/G24 P0):
1. Step "Type" — catalog type (relational / messaging / fileset / model)
2. Step "Provider" — provider (hive / iceberg / hudi / kafka / ...) — dependsOn type
3. Step "Configuration" — URI + credentials + `testConnection: { intent: "testCatalogConnection" }`
4. Step "Properties" — key-value pairs

**Tests:** +16 unit (progress/first/last/empty/back disabled, navigation next+back+submit, dependsOn skip+include, testConnection render/call/success/error/missing, adapter delegation). 367/367 renderer pass.

**Closes:** docs/gravitino-gaps.md G23 (multi-step Create Catalog wizard), G24 (test-connection control).
