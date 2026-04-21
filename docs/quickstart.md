# Quickstart — от `npx` до production за 20 минут

Для соло-фрилансера, который хочет собрать CRUD-платформу поверх существующего backend'а.

## Шаг 1. Скаффолд

```bash
npx create-idf-app my-crm
cd my-crm
```

`create-idf-app` генерит Vite + React 19 + SDK + Mantine 9 + BFF skeleton под Vercel. UI-kit можно сменить:

```bash
npx create-idf-app my-crm --ui-kit shadcn   # doodle style
npx create-idf-app my-crm --ui-kit apple    # visionOS-glass
npx create-idf-app my-crm --ui-kit antd     # enterprise-fintech
```

Внутри:

```
my-crm/
├── src/
│   ├── main.jsx, app.jsx
│   ├── auth.js            # dispatcher по VITE_AUTH_PROVIDER
│   ├── config.js
│   └── domains/default/
│       ├── ontology.js    # entities + intents
│       └── effects.js     # опциональные custom effects
├── api/
│   ├── health.js                # GET /api/health
│   ├── document/[...slug].js    # BFF document materializer
│   ├── voice/[...slug].js       # BFF voice materializer
│   └── agent/[...slug].js       # BFF agent schema
├── vercel.json
└── .env.example
```

## Шаг 2. Импорт схемы

**Вариант A: уже есть Postgres** (Supabase / own-DB)

```bash
DATABASE_URL="postgres://user:pass@host:5432/db" \
  idf import postgres --enrich
```

Читает `information_schema`, генерит `ontology.js` с entities + FK-relations + seed CRUD intents. Флаг `--enrich` запускает `claude` CLI для обогащения (named intents beyond CRUD, absorb-hints, base-roles).

**Вариант B: у тебя OpenAPI spec**

```bash
idf import openapi --file openapi.yaml
```

Парсит OpenAPI 3.x (YAML или JSON). `operationId` из spec'а уважается как имя intent'а. `$ref` резолвится с cycle-detection. REST-conventions → IDF alphas (POST→insert, PATCH/PUT→replace, DELETE→remove, GET list/read).

**Вариант C: у тебя Prisma schema**

```bash
idf import prisma --file prisma/schema.prisma
```

Через `@mrleebo/prisma-ast`. `@id` / `@updatedAt` / `@default(now())` → readOnly. `@relation(fields, references)` → `entity.relations`. Self-ref + named relations поддерживаются.

Подробности в [docs/importers.md](./importers.md).

## Шаг 3. Auth

В `.env`:

```bash
VITE_API_URL=https://api.my-backend.com

# Dev без auth
VITE_AUTH_PROVIDER=none

# JWT (own backend)
VITE_AUTH_PROVIDER=jwt
VITE_AUTH_SIGN_IN_URL=https://api/auth/login

# Supabase
VITE_AUTH_PROVIDER=supabase
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Подробности в [docs/auth.md](./auth.md).

## Шаг 4. Запуск локально

```bash
npm install
npm run dev
```

На `http://localhost:5173` — рендер ProjectionRendererV2 через useHttpEngine. Sign-in UI в header'е (prompt-based для MVP).

Для теста BFF materializers локально:

```bash
npm i -g vercel
vercel dev
```

`vercel dev` поднимает frontend + api/*.js вместе.

## Шаг 5. Deploy

```bash
vercel   # production
```

Vercel разворачивает SPA + serverless functions. API routes работают через `api/*.js` — каждая становится edge/serverless функцией.

## Шаг 6. Проверить материализации

```bash
# Document (JSON document-graph)
curl -X POST https://my-crm.vercel.app/api/document/Task_catalog \
    -H "Content-Type: application/json" \
    -d '{"world": {"tasks": []}, "viewer": {"id": "u1"}}'

# Voice (SSML для TTS)
curl -X POST 'https://my-crm.vercel.app/api/voice/Task_catalog?format=ssml' \
    -H "Content-Type: application/json" \
    -d '{"world": {"tasks": []}}'

# Agent schema (для LLM)
curl https://my-crm.vercel.app/api/agent/schema
```

Подробности в [docs/materializers.md](./materializers.md).

## Шаг 7. Кастомизация

`src/domains/default/ontology.js` — открой и правь. Добавляй:

- `projections` — authored views (catalog / detail / dashboard / feed / form / canvas / wizard)
- `roles` — viewer / admin / agent с разным scope
- Intent'ы beyond CRUD — `approve_*`, `cancel_*`, `publish_*`

После правок — `npm run dev` подхватывает HMR.

## Troubleshooting

- **"Projection not found" от /api/document** — import'ер-generated ontology в MVP не всегда даёт кристаллизуемые projection'ы. Workaround: добавить authored `projections.<Entity>_catalog: { kind: "catalog", mainEntity: "...", witnesses: [...] }`.
- **CORS от user-API** — backend должен разрешать Origin scaffold'а (`*.vercel.app` для preview).
- **Auth 401 в CRUD** — убедись, что `useHttpEngine` получает `authProvider` (не только `getAuthToken`).
- **`pnpm install` падает** — проверь Node 20+ и `.npmrc` с `auto-install-peers=true`.
