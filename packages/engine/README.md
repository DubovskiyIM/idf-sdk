# @intent-driven/engine

> **Status:** experimental (0.1.0) — API может меняться до 1.0.

Φ-lifecycle для парадигмы [Intent-Driven Frontend](https://github.com/DubovskiyIM/idf-sdk): validator, ruleEngine, timeEngine. Доменно-агностичный; транспорт (HTTP/SSE), персистентность (SQLite/Postgres/in-memory) и auth — на стороне host'а.

## Usage

```js
import { createEngine, createInMemoryPersistence } from "@intent-driven/engine";

const engine = createEngine({
  domain,
  persistence: createInMemoryPersistence(),
  clock: () => Date.now(),
  callbacks: {
    onEffectConfirmed(effect) { /* host → SSE */ },
    onEffectRejected(effect, { reason, cascaded }) { /* ... */ },
  },
});

await engine.hydrate();
const result = await engine.submit(effect, { viewer });
```

См. `src/persistence/types.js` для полного описания Persistence interface.

## License

BUSL-1.1 (как @intent-driven/core).
