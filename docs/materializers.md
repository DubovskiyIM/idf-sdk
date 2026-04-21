# Materializers — document / voice / agent через BFF

IDF-манифест §1 говорит о 4 равноправных материализациях: **pixels** (UI), **document** (PDF-ready граф), **voice** (SSML / speech-script), **agent-API** (LLM-consumable schema). Первую обслуживает `@intent-driven/renderer`; остальные три — `@intent-driven/server` как BFF handlers для Vercel-style serverless functions.

## Installation

```bash
npm install @intent-driven/server
```

## Handler factories

### Document

```js
// api/document/[...slug].js
import { createDocumentHandler } from "@intent-driven/server";
import { ontology } from "../../src/domains/default/ontology.js";

export default createDocumentHandler({ ontology });
```

**Request:** `POST /api/document/:projectionId` с body `{ world, viewer?, routeParams? }`.

**Response:** 200 JSON document-graph:

```json
{
  "title": "...",
  "subtitle": "...",
  "meta": { "date": "...", "viewer": "...", "domain": "...", "projection": "..." },
  "sections": [
    { "id": "...", "heading": "...", "kind": "paragraph|table|list|signature", ... }
  ],
  "footer": { "note": "...", "auditTrail": [] }
}
```

Подходит для server-side rendering в PDF (puppeteer), DOCX (docx-js), print.

### Voice

```js
// api/voice/[...slug].js
import { createVoiceHandler } from "@intent-driven/server";
import { ontology } from "../../src/domains/default/ontology.js";

export default createVoiceHandler({ ontology });
```

**Request:** `POST /api/voice/:projectionId?format=json|ssml|plain` с body `{ world, viewer?, routeParams? }`.

**Response:**

- `format=json` (default) — `{ turns: [{role, text, ...}], meta: {...} }` для LLM voice-agent (Claude Voice / OpenAI realtime).
- `format=ssml` — `application/ssml+xml` с `<speak>/<prosody>/<break>` — готово для TTS engines (Amazon Polly, ElevenLabs, Google TTS).
- `format=plain` — `text/plain` без разметки — для debug / phone-IVR baseline.

### Agent

```js
// api/agent/[...slug].js
import { createAgentHandler } from "@intent-driven/server";
import { ontology } from "../../src/domains/default/ontology.js";

export default createAgentHandler({ ontology });
```

**Request:** `GET /api/agent/schema` (or just `/api/agent/`).

**Response:** 200 JSON:

```json
{
  "domain": "default",
  "entities": ["Task", "User"],
  "intents": [
    { "name": "createTask", "target": "Task", "alpha": "insert" },
    ...
  ],
  "roles": ["owner", "admin"]
}
```

Для LLM / script / voice-agent — узнать что доступно.

**MVP: `/exec` и `/world` возвращают 501.** Preapproval-guard, role-filter и выполнение intent'ов будут в следующих релизах.

## Производительность

Все handler'ы используют WeakMap-кэш для `crystallizeV2` по ссылке на ontology. В hot-path serverless (warm instance) — instant. Cold-start: одна кристаллизация per ontology на instance.

```js
// внутри shared.js:
const artifactsCache = new WeakMap();

export function getArtifacts(ontology) {
  let cached = artifactsCache.get(ontology);
  if (cached) return cached;
  const intents = ontology.intents ?? {};
  const derived = deriveProjections(intents, ontology);
  const projections = { ...derived, ...(ontology.projections ?? {}) };
  const byId = crystallizeV2(intents, projections, ontology, ontology.name ?? "default");
  cached = { projections: byId };
  artifactsCache.set(ontology, cached);
  return cached;
}
```

## Reader-equivalence (§23 axiom 5)

В манифесте v2.1 формализован принцип: **все 4 reader'а на одном срезе Φ отдают изоморфный information content**. Т.е. `document(proj, Φ)` и `pixels(proj, Φ)` и `voice(proj, Φ)` говорят одну правду — разными средствами.

На практике в MVP: materializers работают из одного и того же `artifact.slots` + `world`. Расхождения — только в presentation-layer (в document — таблица, в voice — top-3 речью).

## Runtime альтернативы BFF

Handler'ы — обычные `(req, res)` функции. Они работают **где угодно**, где node http-подобный контракт:

- **Vercel serverless functions** (`api/*.js`) — out-of-box в scaffold'е.
- **Netlify Functions** / **Cloudflare Pages Functions** — через их адаптеры.
- **Express / Fastify / Hono** — wrap в middleware:

```js
// Express
app.post("/api/document/:projectionId", async (req, res) => {
  req.query.slug = req.params.projectionId;
  return createDocumentHandler({ ontology })(req, res);
});
```

## Известные ограничения

- **Voice для не-catalog архетипов** возвращает "Неизвестный архетип undefined" — polish voiceMaterializer'а для detail/dashboard/feed — follow-up.
- **Import-generated ontology** использует простой формат intents (`target + alpha`), а `deriveProjections` ожидает IDF-native (`creates + particles.effects`). На текущий момент для materializer'ов нужны authored `projections` в ontology. Follow-up: native-format generator в importer'ах.
- **Agent `/exec` + `/world`** — 501 в MVP.
- **Cold-start latency** — 500ms+ на первый вызов. Cache и warm-up паттерны — optimisation paths.
