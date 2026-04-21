# @intent-driven/auth

Auth-провайдеры для IDF.

```js
// JWT (own backend)
import { createJwtAuth } from "@intent-driven/auth/jwt";
const auth = createJwtAuth({ signInUrl: "https://api.example.com/auth/login" });

// Supabase
import { createClient } from "@supabase/supabase-js";
import { createSupabaseAuth } from "@intent-driven/auth/supabase";
const supa = createClient(URL, KEY);
const auth = createSupabaseAuth(supa);

// React
import { useAuth } from "@intent-driven/auth/react";
const { user, token, signIn, signOut, loading } = useAuth(auth);
```

Provider API:

```ts
interface AuthProvider {
  getToken(): Promise<string | null>;
  getUser(): Promise<User | null>;
  signIn(credentials): Promise<{ user, token }>;
  signOut(): Promise<void>;
  onChange(listener): () => void; // unsubscribe
}
```
