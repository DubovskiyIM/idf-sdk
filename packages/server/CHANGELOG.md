# @intent-driven/server

## 0.2.0

### Minor Changes

- d59befa: `@intent-driven/server@0.1.0` (BSL-1.1) — BFF handlers для IDF materializer'ов, готовые под Vercel serverless (и совместимые Node runtime'ы).

  Три factory:

  - `createDocumentHandler({ ontology })` → POST `/api/document/:projectionId` с body `{ world, viewer?, routeParams? }` → document-graph (JSON)
  - `createVoiceHandler({ ontology })` → POST `/api/voice/:projectionId?format=json|ssml|plain` → соответствующий output
  - `createAgentHandler({ ontology })` → GET `/api/agent/schema` → entities/intents/roles JSON; `/exec` + `/world` — 501 (follow-up)

  Handler'ы — чистые functions `(req, res) => void` с Vercel-совместимым API. Кэш кристаллизации через WeakMap (warm hot-path).

  `@intent-driven/create-idf-app` — template api/\*.js теперь импортирует реальные handlers вместо 501-stubs. Scaffold стал **полноценным end-to-end**: scaffold → import → (enrich) → auth → CRUD runtime → materialization endpoints.

  14 unit-тестов + manual E2E всех 3 handlers. Phase G Этапа 3 — ЗАВЕРШАЕТ Этап 3.
