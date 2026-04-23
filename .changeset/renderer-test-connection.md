---
"@intent-driven/renderer": patch
---

`ProjectionRendererV2` принимает prop `testConnection` и прокидывает в `ctx.testConnection` (P-K-B Keycloak Stage 7).

Wizard primitive уже имеет `step.testConnection` async handler с 2026-04-22, но до этого PR `ProjectionRendererV2` не пробрасывал host-side implementation в ctx — Wizard показывал «ctx.testConnection не реализован».

Теперь host передаёт handler как prop:
```js
<ProjectionRendererV2
  artifact={...}
  exec={wrappedExec}
  testConnection={async (intentId, values) => {
    const res = await fetch(`/api/test/${intentId}`, { method: "POST", body: JSON.stringify(values) });
    const data = await res.json();
    return { ok: res.ok, message: data.message };
  }}
  viewerContext={...}
  routeParams={...}
/>
```

Обёртка подмешивает `viewerContext` + `routeParams` в `values` по той же конвенции, что `wrappedExec` — чтобы server-probe знал текущего пользователя и realm/tenant scope.

Use-case: Keycloak IdP create wizard — middle-step `Endpoints` с `testConnection: { intent: "testIdentityProviderConnection" }` валидирует OAuth discovery URL / SAML metadata до submit.
