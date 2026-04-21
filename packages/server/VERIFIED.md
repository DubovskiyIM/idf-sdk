# End-to-end verification

**Дата:** 2026-04-21
**Ветка:** `feat/server`

## Coverage

- **14 unit-тестов** (`pnpm -F @intent-driven/server test`) — all green
  - `documentHandler` 5 — POST/GET/slug/unknown/string-slug
  - `voiceHandler` 5 — json/ssml/plain formats + error paths
  - `agentHandler` 4 — schema/default/exec/method
- **Manual E2E через direct Node** — ✓ пройден (все 3 handler'а)

## Manual E2E

### Setup

Minimal ontology с `Task` entity + authored `Task_catalog` projection + fake req/res-объекты.

### Run

```bash
node /tmp/server-e2e/e2e.mjs
```

### Output

```
-- Document --
status=200
title=Task_catalog, sections=1

-- Voice (plain) --
status=200, content-type=text/plain; charset=utf-8
body preview: # Task_catalog
[voice · ru-RU · viewer: —]
[system] Ты — голосовой ассистент для домена «test»...

-- Voice (ssml) --
status=200, content-type=application/ssml+xml; charset=utf-8
body preview: <?xml version="1.0"?>
<speak xml:lang="ru-RU">
  <prosody rate="medium">
  <p>...</p>

-- Agent schema --
status=200
entities=Task, intents=2, roles=owner
```

### Что проверено

1. **Document handler** — POST `/api/document/:projectionId` с body `{world, viewer}` возвращает document-graph со structure, sections, meta.
2. **Voice handler + ssml format** — возвращает `application/ssml+xml` с `<speak>/<prosody>/<p>/<break>` тегами — готово для TTS engines.
3. **Voice handler + plain format** — возвращает `text/plain` с system/assistant turns — готово для voice-agent (LLM).
4. **Voice handler + json format** (default) — structured turns для Claude Voice / OpenAI realtime.
5. **Agent handler schema** — публикует entities/intents/roles для LLM-агента.

### Cleanup

```bash
rm -rf /tmp/server-e2e
```

## Known limitations

- В voice-output для не-catalog архетипов пока "Неизвестный архетип undefined" — требует явного `projection.kind` + polish voiceMaterializer (follow-up).
- Agent `/exec` и `/world` — 501 в MVP (будущие Phase G.2/G.3).
- Import-generated ontology (через postgres/openapi/prisma importer'ы) использует `intent.target + alpha`-схему, но `deriveProjections` ожидает `intent.creates + particles.effects`. На текущий момент handler'ам нужны authored projections в ontology. **Follow-up:** native-format generator в importer'ах.

## Acceptance Phase G

| Критерий | Статус |
|---|---|
| `createDocumentHandler({ ontology })` — serverless-ready | ✓ |
| `createVoiceHandler` с 3 форматами (json/ssml/plain) | ✓ |
| `createAgentHandler` (minimal schema endpoint) | ✓ |
| Scaffold api/*.js импортирует handlers | ✓ |
| WeakMap cache для crystallizeV2 | ✓ |
| Типичный Vercel-handler contract `(req, res)` | ✓ |
