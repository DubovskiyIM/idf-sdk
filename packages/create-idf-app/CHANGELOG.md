# @intent-driven/create-idf-app

## 0.2.0

### Minor Changes

- f77392c: Initial release: scaffold для Intent-Driven Frontend через `npx create-idf-app my-app`.

  Включает Vite 6 + React 19 template, hello-world Task-домен, skeleton BFF под Vercel (health + 501-stubs для document/voice/agent materializer'ов). Интегрирован с `@intent-driven/core@0.49`, `renderer@0.25`, `adapter-mantine@1.3` (peer `@mantine/core >= 9`). Часть Этапа 1 плана "IDF standalone Retool-alternative" (2026-04-21).

  UI-kit selectable через `--ui-kit {mantine|shadcn|apple|antd}`, package-manager автоматически детектится из `npm_config_user_agent`.
