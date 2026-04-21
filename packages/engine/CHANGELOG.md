# @intent-driven/engine

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
