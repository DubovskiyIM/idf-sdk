# Importers — schema → IDF ontology

Три independent пакета читают разные источники и производят `Ontology` в едином формате (`entities` + `intents` + `relations` + `roles`). Можно использовать отдельно или через CLI.

## 1. `@intent-driven/importer-postgres`

```bash
DATABASE_URL="postgres://user:pass@host:5432/db" \
  idf import postgres [--schema public] [--out src/domains/default/ontology.js]
```

Или программно:

```js
import { importPostgres } from "@intent-driven/importer-postgres";

const ontology = await importPostgres({
  connectionString: process.env.DATABASE_URL,
  schema: "public",
});
```

### Что делает

1. Читает `information_schema.tables/columns/table_constraints/key_column_usage/constraint_column_usage`.
2. Имена: `orders` → `Order`, `order_items` → `OrderItem`, `categories` → `Category` (PascalCase + singular).
3. Типы: `text`/`varchar` → `string`, `integer`/`numeric` → `number`, `timestamp` → `datetime`, `boolean` → `boolean`, `uuid` → `string`, `json`/`jsonb` → `json`.
4. Role-inference из naming: `title`/`name` → `primary-title`, `email`/`phone` → `contact`, `price`/`amount` + numeric → `money`, `_at`/`_on` → `date-witness` + readOnly, `is_*`/`has_*` + boolean → `status-flag`.
5. FK → `entity.relations[<col>] = { entity: <Parent>, kind: "belongs-to" }`.
6. ownerField inference из `user_id` / `owner_id` / `author_id` / `created_by`.
7. Seed CRUD intents: `create<E>` / `update<E>` / `remove<E>` / `list<E>` / `read<E>` — 5 на каждую entity.

### Проверено на Docker Postgres 16-alpine

5-table e-commerce schema (Users/Categories/Products/Orders/OrderItems с 5 FK, включая self-ref) → 5 entities / 25 intents за секунды.

## 2. `@intent-driven/importer-openapi`

```bash
idf import openapi --file openapi.yaml [--out src/domains/default/ontology.js]
```

Или программно:

```js
import { importOpenApi, parseSpec } from "@intent-driven/importer-openapi";
import fs from "node:fs/promises";

const spec = parseSpec(await fs.readFile("openapi.yaml", "utf8"));
const ontology = importOpenApi(spec);
```

### Что делает

1. Парсит YAML/JSON (через `yaml` package) — автодетект формата.
2. `components.schemas.X` → `entities.X`. Types (OpenAPI) → IDF types (`string`/`integer`/`number`/`boolean`/`object` + `format: date-time` → datetime).
3. Role-inference — та же как в postgres-importer'е.
4. `paths` + methods → intents:
   - `POST /resources` → `create<Res>` (alpha: insert)
   - `PATCH|PUT /resources/{id}` → `update<Res>` (alpha: replace)
   - `DELETE /resources/{id}` → `remove<Res>` (alpha: remove)
   - `GET /resources` → `list<Res>`
   - `GET /resources/{id}` → `read<Res>`
5. `operationId` из spec'а побеждает auto-generated имя (`operationId: addPet` → intent `addPet`).
6. `{param}` в path → IDF `:param` + `required: true` в intent.parameters.
7. `$ref` резолвится с cycle-detection (JSON pointer).

### Проверено на real Swagger Petstore 3.0.4

17 KB spec → 13 entities / 19 intents, все `operationId` уважены.

### Не поддерживается (follow-up)

- `allOf` / `oneOf` / `anyOf` — polymorphic schemas
- Security-схемы → IDF roles автоматически (пока только default `owner`)
- Nested `$ref` в request body / parameters

## 3. `@intent-driven/importer-prisma`

```bash
idf import prisma --file prisma/schema.prisma [--out src/domains/default/ontology.js]
```

Программно:

```js
import { importPrisma } from "@intent-driven/importer-prisma";
import fs from "node:fs/promises";

const source = await fs.readFile("schema.prisma", "utf8");
const ontology = importPrisma(source);
```

### Что делает

1. Парсит `.prisma` через `@mrleebo/prisma-ast` (chevrotain-based).
2. Scalar types: `String`/`Int`/`BigInt`/`Float`/`Decimal` → `string`/`number`, `Boolean`, `DateTime`, `Json`, `Bytes`.
3. Attributes:
   - `@id` → `readOnly: true`
   - `@updatedAt` → `role: date-witness, readOnly: true`
   - `@default(now())` → `readOnly: true` (serialized timestamp — value игнорируется)
   - `@default("literal")` → `default: "literal"` (числа / booleans тоже)
4. `@relation(fields: [fk], references: [id])` → `entity.relations[fk] = { entity: <Parent>, kind: "belongs-to" }`. Single-col only в MVP; multi-col пропускается (редкость).
5. List-relations (`posts Post[]`) игнорируются на стороне child'а — FK реально на парной стороне.
6. Self-ref (`Category.parentId → Category`) и named relations (`@relation("Parent", ...)`) — поддержаны.
7. Seed CRUD intents — те же 5 per entity.

### Проверено на 5-model e-commerce

User / Category (self-ref) / Product / Order / OrderItem → 5 entities / 25 intents / 4 relations.

## Формат ontology.js

Все importer'ы генерируют одинаковую структуру:

```js
export const ontology = {
  name: "default",
  entities: {
    Task: {
      name: "Task",
      kind: "internal",
      ownerField: "userId",
      fields: {
        id: { type: "string", readOnly: true },
        title: { type: "string", role: "primary-title" },
        status: { type: "string", default: "todo" },
        createdAt: { type: "datetime", role: "date-witness", readOnly: true }
      },
      relations: {
        userId: { entity: "User", kind: "belongs-to" }
      }
    }
  },
  intents: {
    createTask: { target: "Task", alpha: "insert", parameters: { title: { type: "string" } } },
    updateTask: { target: "Task", alpha: "replace", parameters: { id: { type: "string", required: true }, ... } },
    // + removeTask / listTask / readTask
  },
  roles: { owner: { base: "owner" } }
};
```

## Enrichment

После любого importer'а можно обогатить ontology через `claude` CLI:

```bash
idf enrich --in src/domains/default/ontology.js
```

Или добавить `--enrich` прямо при import'е (для postgres — inline после schema-read). Claude предлагает:

- **namedIntents** — beyond CRUD (`approve_task`, `activate_product`)
- **absorbHints** — R8 Hub-absorption (OrderItem → Order_detail)
- **additionalRoles** — пропущенные semantic-role inferences
- **baseRoles** — admin / agent / observer из column-signals (`is_admin` → admin-role)

Каждое добавление снабжается witness-комментарием `__witness: "@enricher: <reason>"` — author-transparent.
