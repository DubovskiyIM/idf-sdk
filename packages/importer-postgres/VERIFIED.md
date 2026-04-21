# End-to-end verification

**Дата:** 2026-04-21
**Ветка:** `feat/importer-postgres`

## Coverage

- **31 unit/integration тест** (`pnpm -F @intent-driven/importer-postgres test`) — all green.
- **pg-mem integration** (`test/integration.test.js`) — создаёт users+tasks схему с FK, проверяет полный pipeline introspect → buildOntology.
- **CLI integration** (`idf --help`) — команда `import postgres` зарегистрирована.
- **Manual E2E на Docker Postgres 16-alpine** — ✓ пройден (см. ниже).

## Manual E2E

### Setup

```bash
docker run -d --name idf-test-pg \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=idf_test \
  -p 5435:5432 postgres:16-alpine
```

Seed schema — 5 tables с реалистичной e-commerce shape: `users`, `categories` (self-ref FK), `products`, `orders`, `order_items` (multi-FK). PK на UUID с `gen_random_uuid()`, `created_at` через `now()`, `price` NUMERIC, `is_active` BOOLEAN, enum-like `status` TEXT с default `'draft'`.

### Run

```bash
DATABASE_URL="postgres://postgres:test@localhost:5435/idf_test" \
  node ~/WebstormProjects/idf-sdk/packages/cli/src/cli.js import postgres --out ontology.js
```

### Output

```
→ Reading schema from postgres://postgres:***@localhost:5435/idf_test...
✓ Ontology сгенерирована: 5 entities, 25 intents
  → ontology.js
```

Файл 450 строк, 5 entity-definitions (`Category`, `OrderItem`, `Order`, `Product`, `User`), 25 intents (5 × 5 CRUD), 5 FK-relations.

### Inference проверена на реальных данных

| Pattern | Проверено |
|---|---|
| `name`/`title` → `role: primary-title` | ✓ Category.name, Product.title |
| `price` numeric → `role: money` | ✓ Product.price, Order.total, OrderItem.price |
| `is_active` boolean → `role: status-flag` | ✓ Product.is_active |
| `email` → `role: contact` | ✓ User.email |
| `created_at` timestamptz → `role: date-witness + readOnly` | ✓ User.created_at, Product.created_at, Order.created_at |
| FK `user_id` → `ownerField` | ✓ Order.ownerField = "user_id" |
| FK → `entity.relations[col] = { entity, kind: "belongs-to" }` | ✓ все 5 FK (включая self-ref Category.parent_id → Category) |
| Default `'draft'::text` → `default: "draft"` | ✓ Order.status |
| UUID PK → `type: "string", readOnly: true` | ✓ все 5 entities |

### Cleanup

```bash
docker rm -f idf-test-pg
```

## Known issues (non-blocker)

- **Deprecation warning** `client.query()` при concurrent calls в `Promise.all`. Минорный — `pg@9.0` потребует async/await chain вместо Promise.all. Рефактор на async/await chain в `introspect.js` — follow-up issue.

## Acceptance Phase A

| Критерий | Статус |
|---|---|
| `idf import postgres --url` работает | ✓ |
| Entities с FK-relations | ✓ (5 FK включая self-ref) |
| Семантические роли inference | ✓ (6 паттернов проверены на real schema) |
| Seed CRUD intents | ✓ (25 intents для 5 entities) |
| Ontology writes to disk | ✓ (450 строк formatted JS) |
| 20-мин target | ✓ (import занимает секунды на local DB) |
