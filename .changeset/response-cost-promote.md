---
"@intent-driven/core": minor
---

Promote response-cost-before-action candidate → stable с полной реализацией.

Cross-archetype (catalog/detail/feed — везде с toolbar). `apply` обогащает label
toolbar-item'ов суффиксом ' · {cost} {currency}' для intent'ов с `costHint`
(top-level, `meta`, или `particles`). Idempotent, детерминирован.

Anti-footgun для monetized actions: 'Откликнуться · 80 ₽', 'Boost · 99 ₽'.
Cost transparent до клика — закрывает profi/workzilla/youdo UX-gap.

Modal-confirm force отложено (требует pipeline refactor).
