---
"@intent-driven/create-idf-app": patch
---

**Scaffold build fix** — `@supabase/supabase-js` external + актуальные SDK-версии.

`vite build` падал на Rollup resolve dynamic import'а `@supabase/supabase-js` из `src/auth.js`, даже когда `VITE_AUTH_PROVIDER !== "supabase"` (dead-branch). Rollup pre-resolve'ит dynamic imports независимо от conditional path.

- `vite.config.js`: `build.rollupOptions.external: ["@supabase/supabase-js"]` — runtime dynamic import по-прежнему работает, но только если пользователь явно установит пакет + включит supabase auth.
- `package.json.tmpl` bump: core `0.49 → 0.50`, renderer `0.25 → 0.26`, effect-runner-http `0.1 → 0.3`, auth `0.1 → 0.2`, server `0.1 → 0.2`.

Smoke: scaffold → `npm install` → `npm run build` → success (529KB bundle, 2384 modules).
