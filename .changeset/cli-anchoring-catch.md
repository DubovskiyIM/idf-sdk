---
"@intent-driven/cli": patch
---

feat(cli): validate.js ловит AnchoringError и печатает findings

Если `crystallizeV2` в strict-режиме throw'ит `AnchoringError`, CLI теперь
печатает каждый structural miss с actionable-подсказкой в stderr, затем
re-throw. Это даёт автору сгенерированного домена чёткую диагностику: какой
intent, какая частица, как исправить.
