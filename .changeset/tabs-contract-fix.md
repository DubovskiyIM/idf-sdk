---
"@intent-driven/adapter-shadcn": patch
"@intent-driven/adapter-apple": patch
---

Привести контракт `Tabs` в shadcn и Apple адаптерах к каноническому: `{ items, active, onSelect, extra }` (как в Mantine и AntD адаптерах + `V2Shell.AdaptedTabs`).

До этого shadcn и Apple ожидали `{ tabs, value, onChange }` — что приводило к runtime-ошибке `Cannot read properties of undefined (reading 'map')` при использовании этих адаптеров в реальном shell'е (lifequest на shadcn, reflect на Apple). Каллер всегда передаёт `items/active/onSelect`.

Без breaking change для прямых потребителей — оба адаптера используются только через renderer, который шлёт `items`. Также добавлен дефолт `items = []`.
