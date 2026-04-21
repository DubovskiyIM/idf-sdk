# @intent-driven/create-idf-app

## 0.4.0

### Minor Changes

- 9f9bb40: `@intent-driven/auth@0.1.0` — auth-провайдеры для IDF. Общий contract `{ getToken, getUser, signIn, signOut, onChange }` с двумя реализациями:

  - `@intent-driven/auth/jwt` — generic JWT для own backend. POST на `signInUrl`, токен в storage, `Bearer`-header.
  - `@intent-driven/auth/supabase` — wrapper вокруг `@supabase/supabase-js` (peer-dep, опционален).
  - `@intent-driven/auth/react` — hook `useAuth(provider) → { user, token, loading, signIn, signOut }`.

  Storage abstraction: `memoryStorage()` / `webStorage(localStorage)` / `defaultStorage()` (auto).

  `@intent-driven/effect-runner-http` — `useHttpEngine` теперь принимает `authProvider` (alt. к `getAuthToken`). На sign-in/sign-out автоматически делает reload коллекций через `provider.onChange`.

  `@intent-driven/create-idf-app` — scaffold template включает `src/auth.js` с dispatcher'ом по `VITE_AUTH_PROVIDER` (none/jwt/supabase), `app.jsx` имеет sign-in UI и headroom.

  15 unit-тестов (storage/jwt/supabase). Phase F Этапа 3.

## 0.3.0

### Minor Changes

- 1ba6038: `@intent-driven/effect-runner-http@0.1.0` (BSL-1.1) — generic HTTP effect-runner для IDF. Преобразует intents в fetch-запросы через CRUD-conventions (POST/PATCH/DELETE/GET с `:id` path-params). Public API: `runIntent()` (pure async) + `useHttpEngine()` React hook. `inferEndpoint` inferrит HTTP method + path из `intent.alpha` + entity-name; `intent.endpoint` override'ит inference. Auth через sync/async `getAuthToken`.

  `@intent-driven/create-idf-app` template обновлён: `app.jsx` использует `useHttpEngine` против `config.apiUrl`, CRUD работает против реального backend'а (Supabase PostgREST / own-REST) после `idf import postgres`.

  27 unit/integration тестов + manual E2E полным CRUD-циклом против локального Node:http сервера. Phase C Этапа 2 плана "IDF standalone Retool-alternative" (2026-04-21).

## 0.2.0

### Minor Changes

- f77392c: Initial release: scaffold для Intent-Driven Frontend через `npx create-idf-app my-app`.

  Включает Vite 6 + React 19 template, hello-world Task-домен, skeleton BFF под Vercel (health + 501-stubs для document/voice/agent materializer'ов). Интегрирован с `@intent-driven/core@0.49`, `renderer@0.25`, `adapter-mantine@1.3` (peer `@mantine/core >= 9`). Часть Этапа 1 плана "IDF standalone Retool-alternative" (2026-04-21).

  UI-kit selectable через `--ui-kit {mantine|shadcn|apple|antd}`, package-manager автоматически детектится из `npm_config_user_agent`.
