# End-to-end verification

**Дата:** 2026-04-21
**Ветка:** `feat/importer-prisma`

## Coverage

- **27 unit/integration тестов** (`pnpm -F @intent-driven/importer-prisma test`) — all green
  - `parsePrisma` 4 — wrapper над @mrleebo/prisma-ast
  - `modelFieldToField` 15 — type-mapping + role-inference + @id/@updatedAt
  - `modelToEntity` 4 — entity build + ownerField
  - `buildRelations` 3 — single-col FK, игнор list/multi-col
  - `importPrisma` 1 — full-pipeline
- **Manual E2E на real 5-model Prisma schema** — ✓ пройден

## Manual E2E

### Source: 5-model e-commerce schema.prisma

`User`, `Category` (self-ref), `Product`, `Order`, `OrderItem` + relations через `@relation(fields, references)`.

### Run

```bash
node ~/WebstormProjects/idf-sdk/packages/cli/src/cli.js \
  import prisma --file schema.prisma --out ontology.js
```

### Output

```
→ Reading Prisma schema from schema.prisma...
✓ Ontology сгенерирована: 5 entities, 25 intents
  → ontology.js
```

### Inference на реальных данных

| Pattern | Inferred |
|---|---|
| `id String @id @default(cuid())` | `type: "string", readOnly: true` |
| `email String @unique` | `role: "contact"` |
| `price Decimal` | `type: "number", role: "money"` |
| `isActive Boolean` | `role: "status-flag"` |
| `title String` / `name String` | `role: "primary-title"` |
| `createdAt DateTime @default(now())` | `role: "date-witness", readOnly: true` |
| `updatedAt DateTime @updatedAt` | `role: "date-witness", readOnly: true` |
| `userId String` + `user User @relation(fields: [userId], references: [id])` | `ownerField: "userId"` + `relations.userId = { entity: "User", kind: "belongs-to" }` |
| `status String @default("draft")` | `default: "draft"` |
| Self-ref `parentId String?` + `@relation("CategoryParent", fields: [parentId], references: [id])` | `relations.parentId = { entity: "Category", kind: "belongs-to" }` |

### 4 relation'а найдены

- `Category.parentId → Category` (self-ref)
- `Product.categoryId → Category`
- `Order.userId → User` (+ ownerField)
- `OrderItem.orderId → Order` и `OrderItem.productId → Product`

### Cleanup

```bash
rm -rf /tmp/prisma-e2e
```

## Acceptance Phase E

| Критерий | Статус |
|---|---|
| `idf import prisma --file <schema.prisma>` работает | ✓ |
| Prisma scalar types → IDF types (String/Int/DateTime/Boolean/Decimal/Json) | ✓ |
| `@id` / `@updatedAt` / `@default(now())` → readOnly + role | ✓ |
| `@default("literal")` → IDF default | ✓ |
| `@relation(fields, references)` single-col → entity.relations | ✓ |
| Self-referencing relations (Category → Category) | ✓ |
| Named relations (`@relation("CategoryParent", ...)`) | ✓ |
| List-relations (Post[]) игнорируются как relation-peers | ✓ |
| ownerField inference из userId/authorId | ✓ |
| Seed CRUD intents (5 на entity) | ✓ |
