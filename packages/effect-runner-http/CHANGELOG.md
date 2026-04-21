# @intent-driven/effect-runner-http

## 0.2.0

### Minor Changes

- 1ba6038: `@intent-driven/effect-runner-http@0.1.0` (BSL-1.1) — generic HTTP effect-runner для IDF. Преобразует intents в fetch-запросы через CRUD-conventions (POST/PATCH/DELETE/GET с `:id` path-params). Public API: `runIntent()` (pure async) + `useHttpEngine()` React hook. `inferEndpoint` inferrит HTTP method + path из `intent.alpha` + entity-name; `intent.endpoint` override'ит inference. Auth через sync/async `getAuthToken`.

  `@intent-driven/create-idf-app` template обновлён: `app.jsx` использует `useHttpEngine` против `config.apiUrl`, CRUD работает против реального backend'а (Supabase PostgREST / own-REST) после `idf import postgres`.

  27 unit/integration тестов + manual E2E полным CRUD-циклом против локального Node:http сервера. Phase C Этапа 2 плана "IDF standalone Retool-alternative" (2026-04-21).
