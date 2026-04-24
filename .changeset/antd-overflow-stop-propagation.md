---
"@intent-driven/adapter-antd": patch
---

AntdOverflowMenu: stopPropagation на trigger и menu items. Без фикса клик по ⋮ в Card бабблит до row-onClick → navigate открывает detail, меню вообще не открывается. Теперь ведёт себя как SDK-fallback InlineOverflowMenu (containers.jsx).
