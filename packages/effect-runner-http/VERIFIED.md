# End-to-end verification

**Дата:** 2026-04-21
**Ветка:** `feat/effect-runner-http`

## Coverage

- **27 unit/integration тестов** (`pnpm -F @intent-driven/effect-runner-http test`) — all green
- **Manual E2E против локального HTTP-сервера** — ✓ пройден

## Manual E2E

Mini HTTP-сервер на Node:http (порт 4000) — эмулирует REST API с `/tasks` collection + `/tasks/:id` resource. Не использовал json-server (npm-cache permission issue).

### Output full CRUD

```
-- 1. listTask initial --
true [ { id: '1', title: 'Seed task', status: 'todo' } ]

-- 2. createTask --
true { id: '2', title: 'New CRUD test', status: 'todo' }

-- 3. readTask --
true { id: '2', title: 'New CRUD test', status: 'todo' }

-- 4. updateTask --
true { id: '2', title: 'New CRUD test', status: 'done' }

-- 5. listTask after update --
true 2 items

-- 6. removeTask --
true status=204

-- 7. listTask after remove --
true 1 items
```

Все 7 шагов прошли. HTTP-methods (GET/POST/PATCH/DELETE) и path-params через `inferEndpoint` + `buildFetchRequest` отрабатывают корректно.

## Acceptance Phase C

| Критерий | Статус |
|---|---|
| `runIntent()` pure async | ✓ |
| 4 CRUD-conventions (POST/PATCH/DELETE/GET) | ✓ |
| `:id` в path + body/query | ✓ |
| Auth-header через `getAuthToken` (sync + async) | ✓ |
| HTTP 4xx/5xx → result.ok=false | ✓ |
| Network error → result.ok=false | ✓ |
| React hook `useHttpEngine` | ✓ |
| Scaffold template использует useHttpEngine | ✓ |
