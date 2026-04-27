---
"@intent-driven/core": patch
---

fix: re-export `patternKey` API из root `@intent-driven/core` (follow-up to #418).

PR #418 добавил `patternKey` / `isSameLogicalPattern` / `findPatternByKey` / `parsePatternKey` / `logicalId` в `packages/core/src/patterns/index.js`, но забыл re-export'нуть из root `packages/core/src/index.js`. В результате `import { patternKey } from "@intent-driven/core"` падал с `patternKey is not a function`.

Теперь все 5 helpers доступны через canonical root import.

Found via: host meta-domain seed migration на patternKey API → TypeError при первом use.
