---
"@intent-driven/auth": minor
"@intent-driven/effect-runner-http": minor
"@intent-driven/create-idf-app": minor
---

`@intent-driven/auth@0.1.0` — auth-провайдеры для IDF. Общий contract `{ getToken, getUser, signIn, signOut, onChange }` с двумя реализациями:

- `@intent-driven/auth/jwt` — generic JWT для own backend. POST на `signInUrl`, токен в storage, `Bearer`-header.
- `@intent-driven/auth/supabase` — wrapper вокруг `@supabase/supabase-js` (peer-dep, опционален).
- `@intent-driven/auth/react` — hook `useAuth(provider) → { user, token, loading, signIn, signOut }`.

Storage abstraction: `memoryStorage()` / `webStorage(localStorage)` / `defaultStorage()` (auto).

`@intent-driven/effect-runner-http` — `useHttpEngine` теперь принимает `authProvider` (alt. к `getAuthToken`). На sign-in/sign-out автоматически делает reload коллекций через `provider.onChange`.

`@intent-driven/create-idf-app` — scaffold template включает `src/auth.js` с dispatcher'ом по `VITE_AUTH_PROVIDER` (none/jwt/supabase), `app.jsx` имеет sign-in UI и headroom.

15 unit-тестов (storage/jwt/supabase). Phase F Этапа 3.
