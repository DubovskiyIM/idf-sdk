---
"@intent-driven/renderer": minor
---

`<Icon/>` primitive — централизованный icon-component с lucide-react default + emoji fallback. Канонические имена (schema/table/edit/delete/...). Host регистрирует custom resolver через `registerIconResolver(fn)`.

Старый emoji-based `Icon` из `adapters/Icon.jsx` остался доступен как `IconLegacy` для backward compat. Lucide-react тянется через адаптеры (mantine/shadcn/apple/antd) — без peer на renderer-уровне (избегаем `@types/react` diamond). Если lucide-react не установлен — automatic fallback к emoji.
