---
"@intent-driven/adapter-antd-blockeditor-tiptap": patch
---

fix(blockeditor-tiptap): «React is not defined» в dist (JSX classic runtime)

Notion field-test (2026-04-27): после bump'а до `@intent-driven/adapter-antd-blockeditor-tiptap@0.3.0` host runtime падал:

```
React is not defined
  at TiptapBlockEditor (...adapter-antd-blockeditor-tiptap.js:23541:30)
  at BlockEditor (<anonymous>)
  at BlockCanvas (...domains/notion/canvas/BlockCanvas.jsx:56:39)
```

Причина: tsup ESM build для `.jsx` использовал classic JSX transform (генерирует `React.createElement(...)`), но source-файлы (`TiptapBlockEditor.jsx` / `SlashMenu.jsx` / `InlineBubbleMenu.jsx`) не импортируют `React` явно — только хуки (`useMemo`, `useEffect` и т.п.). На host'е `react/jsx-runtime` подгружается, но classic-output ожидает `React` в scope → undefined → crash.

## Fix

1. **`tsup.config.js`** — `esbuildOptions(options) { options.jsx = "automatic"; }` (для будущих файлов в pkg).
2. **Все 3 .jsx файла** — `import React from "react"` (defensive, на случай если esbuild опции не отрабатывают где-то).

Verify: `dist/index.mjs` теперь использует `react/jsx-runtime` (`import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime"`), classic `React.createElement` calls = 0.

## Тесты

44/44 passing (kindMap + applyTiptapBlockEditor + SlashMenu).

## Версия

`@intent-driven/adapter-antd-blockeditor-tiptap`: `0.3.0` → `0.3.1` (patch).
