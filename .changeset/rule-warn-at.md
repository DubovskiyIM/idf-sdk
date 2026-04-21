---
"@intent-driven/engine": minor
---

ruleEngine/scheduleV2: `rule.warnAt` — вторичный timer-для-предупреждения за N до основного `firesAt`.

Rule теперь может задавать:
- `warnAt: "2h"` — за сколько до `firesAt` эмитнуть warn-timer (relative duration).
- `warnIntent: "notify_X"` — intent_id warn-timer'а; default `"__warn"`.
- `warnParams: { id: "$.bookingId", kind: "expiration" }` — params warn-timer'а; default = resolved `params` primary-timer'а.

Оба timer'а (primary + warning) делят `triggerEventKey`, поэтому `revokeOn` автоматически снимает оба. warnAt проверяется per-rule: невалидный parse, warnAt ≥ duration, либо `warnFiresAt <= nowMs` → warning пропускается, primary остаётся.

Типичный кейс — booking TTL: `{after:"24h", fireIntent:"auto_cancel", warnAt:"2h", warnIntent:"notify_expiring"}` — пользователь получает уведомление за 2h до auto-cancel. Закрывает backlog §5.2.
