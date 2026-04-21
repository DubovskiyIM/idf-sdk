# @intent-driven/engine

## 0.3.0

### Minor Changes

- 0e445e4: ruleEngine/scheduleV2: `rule.warnAt` — вторичный timer-для-предупреждения за N до основного `firesAt`.

  Rule теперь может задавать:

  - `warnAt: "2h"` — за сколько до `firesAt` эмитнуть warn-timer (relative duration).
  - `warnIntent: "notify_X"` — intent_id warn-timer'а; default `"__warn"`.
  - `warnParams: { id: "$.bookingId", kind: "expiration" }` — params warn-timer'а; default = resolved `params` primary-timer'а.

  Оба timer'а (primary + warning) делят `triggerEventKey`, поэтому `revokeOn` автоматически снимает оба. warnAt проверяется per-rule: невалидный parse, warnAt ≥ duration, либо `warnFiresAt <= nowMs` → warning пропускается, primary остаётся.

  Типичный кейс — booking TTL: `{after:"24h", fireIntent:"auto_cancel", warnAt:"2h", warnIntent:"notify_expiring"}` — пользователь получает уведомление за 2h до auto-cancel. Закрывает backlog §5.2.

## 0.2.0

### Minor Changes

- 3108bfb: Initial release: Φ-lifecycle package (validator + ruleEngine + timeEngine) извлечён из idf host в npm-пакет. Experimental 0.1.0.

  - `createEngine({ domain, persistence, clock, callbacks })` — factory
  - `createInMemoryPersistence()` — reference impl для тестов и dev
  - Persistence DI interface — host предоставляет SQLite/Postgres adapter
  - Building blocks: `createValidator` / `createRuleEngine` / `createTimeEngine` / `TimerQueue`
  - Schedule v2 helpers (`parseDuration`, `resolveFiresAt`) — relative/absolute timer expressions
  - Property-based тесты: fold determinism, cascadeReject idempotency, timer ordering, rule determinism
  - Host-migration через feature flag `USE_ENGINE_PKG=1` (Phase 7)
