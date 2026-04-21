# End-to-end verification

**Дата:** 2026-04-21
**Ветка:** `feat/create-idf-app`

## Что проверено вручную

### 1. Scaffold + install

```bash
cd /tmp && rm -rf test-idf-app
npm_config_user_agent="pnpm/9.0.0 node/20.0.0" \
  node ~/WebstormProjects/idf-sdk/packages/create-idf-app/src/cli.js test-idf-app
```

Результат: scaffold создал 16 файлов (package.json, vite.config.js, src/*, api/*, vercel.json, README.md, .env.example, .gitignore). `pnpm install` прошёл за 7.9s, поставил:

- `@intent-driven/core@0.49.0`, `@intent-driven/renderer@0.25.0`, `@intent-driven/adapter-mantine@1.3.0`
- `@mantine/core@9.0.2`, `@mantine/dates@9.0.2`, `@mantine/hooks@9.0.2`, `lucide-react@0.400.0`
- `react@19.2.5`, `react-dom@19.2.5`
- `vite@6.4.2`, `@vitejs/plugin-react@4.7.0`

### 2. Dev-сервер

```bash
cd /tmp/test-idf-app && pnpm run dev
```

Результат: Vite v6.4.2 поднялся на <http://localhost:5173/> за 1.1s. `curl -sI` вернул `HTTP/1.1 200 OK`, HTML-entry корректно вычитывается с `<div id="root"></div>` + `<script src="/src/main.jsx">`. React-refresh inject работает.

## Что осталось проверить руками

- [ ] **`vercel dev`** — локальный запуск serverless functions из `api/*.js`. Требует `npm i -g vercel` и `vercel login`. Не в sandbox'е сессии, выполнить при первом реальном deploy'е.
- [ ] **`vercel deploy`** — production deploy на Vercel. Acceptance Этапа 1 plan'а. Выполнить один раз руками после merge PR.
- [ ] **Визуальная проверка render'а** — открыть http://localhost:5173 в браузере, убедиться что hello-world Task-домен рендерится через ProjectionRendererV2 + mantine-adapter.

## Обнаруженные расхождения с планом

- **React 19 + Mantine 9** вместо заложенных React 18 + Mantine 7. Причина: `@intent-driven/adapter-mantine@1.3.0` имеет peer `@mantine/core >= 9`, который, в свою очередь, требует `react >= 19.2`. План поправлен inline перед Task 6.
- **`lucide-react`** добавлен в deps — peer adapter-mantine.
- **`npm` как package-manager падает** из-за root-owned файлов в npm-cache пользователя (системная проблема, не наша). `pnpm` работает. CLI корректно detect'ит через `npm_config_user_agent`.

## Вывод

Acceptance Этапа 1: ✓ scaffold + install + dev-сервер работают end-to-end через `pnpm`. Production-deploy на Vercel остаётся ручным шагом после merge PR.
