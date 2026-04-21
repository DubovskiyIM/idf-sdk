# Auth — JWT и Supabase providers

`@intent-driven/auth` — единый пакет с subpath-exports для двух provider'ов + React hook. Peer-dep на `@supabase/supabase-js` опциональный.

## Общий contract

```ts
interface AuthProvider {
  getToken(): Promise<string | null>;   // "Bearer <token>" или null
  getUser(): Promise<User | null>;
  signIn(credentials): Promise<{ user, token }>;
  signOut(): Promise<void>;
  onChange(listener): () => void;        // unsubscribe
}
```

## JWT provider

Для own-backend'а с POST-endpoint'ом, возвращающим `{ token, user }`.

```js
import { createJwtAuth } from "@intent-driven/auth/jwt";

const auth = createJwtAuth({
  signInUrl: "https://api.example.com/auth/login",
  // Optional:
  storage: memoryStorage() | webStorage(localStorage) | defaultStorage(),
  tokenField: "token",       // если backend отдаёт не "token"
  userField: "user",          // если backend отдаёт не "user"
  tokenPrefix: "Bearer",      // если backend ожидает другой scheme
});

// Sign-in
const { user, token } = await auth.signIn({ email, password });

// Получить header-value для fetch
const header = await auth.getToken();  // "Bearer raw-jwt"

// Subscribe на state-change
const unsubscribe = auth.onChange(() => { /* refetch */ });
```

**Persistence:** если `storage` имеет сохранённый token при init, `getToken()` / `getUser()` возвращают его сразу. Без I/O — работает synchronously после первого sign-in.

## Supabase provider

Wrapper вокруг `@supabase/supabase-js` client.

```js
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAuth } from "@intent-driven/auth/supabase";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const auth = createSupabaseAuth(supabase);

// signInWithPassword
await auth.signIn({ email, password });

// Magic-link — используй supabase напрямую:
await supabase.auth.signInWithOtp({ email });

// onChange использует supabase.auth.onAuthStateChange
```

Для OAuth и magic-link флоу — просто работай с `supabase.auth.*` напрямую, затем `getToken()` возвращает текущий session.access_token.

## React hook

```jsx
import { useAuth } from "@intent-driven/auth/react";

function AuthBar({ provider }) {
  const { user, token, loading, signIn, signOut } = useAuth(provider);

  if (loading) return "…";
  if (!user) return <button onClick={() => signIn({ email, password })}>Sign in</button>;
  return <>{user.email} <button onClick={signOut}>Out</button></>;
}
```

Hook подписывается на `provider.onChange` и автоматически refetch'ит `user`/`token` на изменения.

## Интеграция с effect-runner-http

```js
const { world, run } = useHttpEngine({
  ontology,
  apiUrl: config.apiUrl,
  authProvider: auth,   // ← вместо getAuthToken
});
```

`useHttpEngine` автоматически:

1. Берёт token через `authProvider.getToken()` перед каждым fetch.
2. Reload'ит все коллекции при `provider.onChange` (после sign-in / sign-out).

## Storage

```js
import { memoryStorage, webStorage, defaultStorage } from "@intent-driven/auth";

const mem = memoryStorage();                 // in-process (тесты)
const web = webStorage(localStorage);        // custom backend
const auto = defaultStorage();               // web в браузере, memory в Node
```

## В scaffold'е

`src/auth.js` — dispatcher по `VITE_AUTH_PROVIDER`:

```js
export async function createAuthProvider() {
  const kind = import.meta.env.VITE_AUTH_PROVIDER;
  if (kind === "none" || !kind) return null;
  if (kind === "jwt") {
    const { createJwtAuth } = await import("@intent-driven/auth/jwt");
    return createJwtAuth({ signInUrl: import.meta.env.VITE_AUTH_SIGN_IN_URL });
  }
  if (kind === "supabase") {
    const { createSupabaseAuth } = await import("@intent-driven/auth/supabase");
    const { createClient } = await import("@supabase/supabase-js");
    return createSupabaseAuth(createClient(URL, KEY));
  }
}
```

Lazy-imports — tree-shaking payload только то, что используется.

## Не в MVP (follow-up)

- **Sign-up UI** — пока только prompt(). Нужна форма в scaffold.
- **Token auto-refresh** — timer-based refresh для JWT expire.
- **Clerk / Auth0** — дополнительные backends.
- **Role-scoped token** — custom claims в JWT для `filterWorldForRole`.
