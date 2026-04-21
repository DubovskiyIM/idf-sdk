# @intent-driven/server

BFF-handlers для IDF: document / voice / agent материализации поверх `@intent-driven/core` materializer'ов.

Предназначен для Vercel serverless functions (и аналогичных Node-runtime).

```js
// api/document/[...slug].js
import { createDocumentHandler } from "@intent-driven/server";
import { ontology } from "../../src/domains/default/ontology.js";

export default createDocumentHandler({ ontology });
```

```js
// api/voice/[...slug].js
import { createVoiceHandler } from "@intent-driven/server";
import { ontology } from "../../src/domains/default/ontology.js";

export default createVoiceHandler({ ontology });
```

## Request format

```
POST /api/document/:projectionId
Body: { world, viewer?, routeParams? }
→ 200 application/json — document-graph от materializeAsDocument

POST /api/voice/:projectionId?format=json|ssml|plain
Body: { world, viewer?, routeParams? }
→ 200 — voice-graph (json) / SSML text / plain text
```
