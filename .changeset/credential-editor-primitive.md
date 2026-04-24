---
"@intent-driven/renderer": minor
---

`CredentialEditor` primitive — multi-kind credential viewer (P-K-C Keycloak Stage 8).

Discriminator-driven primitive для User.credentials entity с 4 типами: `password` / `otp` / `webauthn` / `x509` + fallback для unknown. Sidebar со списком credentials + detail-area с type-specific sub-view.

## Shape

```js
value: [
  { id, type: "password", userLabel, createdDate, algorithm, hashIterations, temporary },
  { id, type: "otp",      userLabel, createdDate, algorithm, digits, period, counter?, device? },
  { id, type: "webauthn", userLabel, createdDate, device, credentialData },
  { id, type: "x509",     userLabel, createdDate, device, credentialData },
]
```

## Sub-views

- **password** — hashed storage meta (algorithm / iterations / temporary), notice про невозможность plain-password; action `rotate` по умолчанию
- **otp** — TOTP (period) vs HOTP (counter), algorithm / digits / period / device; action `revealSecret` одноразовый
- **webauthn** — device name + truncated credential-id
- **x509** — subject + truncated DER
- **unknown** — fallback key-value таблица

## Actions

Default map `actionsByType`:
- `password` → `[rotate, delete]`
- `otp` → `[revealSecret, delete]`
- `webauthn` → `[delete]`
- `x509` → `[delete]`

Host передаёт `onAction(action, credential)` — обрабатывает через `ctx.exec`. `readOnly: true` (default) — actions не рендерятся.

## Tests

`CredentialEditor.test.jsx` — 17 новых: basic rendering / empty state / per-type sub-views (password/otp/TOTP vs HOTP/webauthn/x509/unknown) / selection (internal + controlled) / actions read-only и interactive + custom actionsByType override.

`@intent-driven/renderer`: **492 passed** (было 475, +17).

## Use-case

Keycloak User.credentials — показывает все credentials пользователя + per-type actions. Аналогично AWS IAM access-keys, SSH-keys management, API-keys rotation UI.
