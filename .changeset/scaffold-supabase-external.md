---
"@intent-driven/create-idf-app": minor
---

**Scaffold build fix** — UI-kit-specific template resolution + `@supabase/supabase-js` external + актуальные SDK-версии.

**UI-kit templating.** Раньше `src/app.jsx` hardcoded `import { mantineAdapter } from "@intent-driven/adapter-mantine"` + `<MantineProvider>` — для scaffold'а с `--ui-kit antd` build падал на resolve'е mantine-пакета. Новые токены:

- `__UI_KIT_ADAPTER_NAME__` (`mantineAdapter` / `antdAdapter` / …)
- `__UI_KIT_EXTRA_IMPORTS__` (`<MantineProvider>` import OR `ConfigProvider + locale` для antd)
- `__UI_KIT_PROVIDER_OPEN__` / `__UI_KIT_PROVIDER_CLOSE__` (JSX-обёртка)
- `__UI_KIT_CSS_IMPORT__` (side-effect css, пустой для antd)
- `__UI_KIT_EXTRA_DEPS__` (дополнительные npm-зависимости в package.json)

Источник — `src/ui-kit-vars.js` (REGISTRY для mantine / antd / apple / shadcn). CLI вычисляет vars через `buildVars({projectName, uiKit})` и передаёт в scaffold. `src/app.jsx` переименован в `.tmpl`.

**Build fix.**

`vite build` падал на Rollup resolve dynamic import'а `@supabase/supabase-js` из `src/auth.js`, даже когда `VITE_AUTH_PROVIDER !== "supabase"` (dead-branch). Rollup pre-resolve'ит dynamic imports независимо от conditional path.

- `vite.config.js`: `build.rollupOptions.external: ["@supabase/supabase-js"]` — runtime dynamic import по-прежнему работает, но только если пользователь явно установит пакет + включит supabase auth.
- `package.json.tmpl` bump: core `0.49 → 0.50`, renderer `0.25 → 0.26`, effect-runner-http `0.1 → 0.3`, auth `0.1 → 0.2`, server `0.1 → 0.2`.

Smoke: scaffold → `npm install` → `npm run build` → success (529KB bundle, 2384 modules).
