---
"@intent-driven/importer-postgres": minor
"@intent-driven/importer-openapi": minor
"@intent-driven/importer-prisma": minor
---

Все три importer'а теперь генерируют intent'ы в **native IDF format** одновременно с legacy-плоским форматом:

- `creates: "Entity"` — для insert-intent'ов
- `particles.confirmation: "enter"` — feed-signal при создании
- `particles.effects: [{ target, op }]` — для всех mutation-intent'ов

Это закрывает gap между importer-generated ontology и `@intent-driven/core` `deriveProjections`: после import'а ontology **сразу кристаллизуется** через R1-R7 правила, и `@intent-driven/server` document/voice handler'ы работают без ручного редактирования `projections`.

Legacy-формат (`target + alpha + parameters`) сохранён — для обратной совместимости с `@intent-driven/effect-runner-http`.

E2E проверено на Prisma-schema (2 entities → 5 derived projections → document handler HTTP 200). См. `packages/importer-prisma/VERIFIED-native.md`.
