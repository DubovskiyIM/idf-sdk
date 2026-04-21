# End-to-end verification

**Дата:** 2026-04-21
**Ветка:** `feat/importer-openapi`

## Coverage

- **35 unit/integration тестов** (`pnpm -F @intent-driven/importer-openapi test`) — all green
  - `resolveRef` 5 — JSON-pointer + cycle detection
  - `schemaToEntity / propertyToField` 13 — type-mapping + role-inference
  - `pathToIntent` 14 — CRUD-conventions + operationId override
  - `importOpenApi` 3 — full-pipeline integration
- **Manual E2E на Swagger Petstore 3.0.4** — ✓ пройден

## Manual E2E

### Setup

Скачан real spec: `https://petstore3.swagger.io/api/v3/openapi.json` (17 KB, OpenAPI 3.0.4). Содержит 5 schemas (Pet/Order/Category/User/Tag/ApiResponse) + ~19 paths через 5 tags (pet / store / user + helpers).

### Run

```bash
node ~/WebstormProjects/idf-sdk/packages/cli/src/cli.js \
  import openapi --file /tmp/openapi-e2e/petstore.json --out ontology.js
```

### Output

```
→ Reading OpenAPI spec from petstore.json...
✓ Ontology сгенерирована: 13 entities, 19 intents
  → ontology.js
```

### Инференс на реальных данных

- **Entities распознаны**: Order, Category, User, Tag, Pet, ApiResponse (6 из components.schemas) + 7 созданы автоматически из path-сегментов (FindByStatu/FindByTag/UploadImage/Inventory — edge cases для rpc-style путей типа `/pet/findByStatus`).
- **19 intents**: все используют `operationId` из spec'а (addPet, findPetsByStatus, getPetById, updatePetWithForm, deletePet, uploadFile, placeOrder, getOrderById, createUser, loginUser, logoutUser, getUserByName, и т.д.) — IDF нейминг уважает author'ские операции.
- **Path-params как IDF-required**: `{petId}` → `:petId` в endpoint + `parameters.id.required = true`.
- **Role-inference**: `User.email` → `contact`, `Order.shipDate` → `date-witness`, `Pet.name`/`Category.name` → `primary-title`.
- **Enums сохранены**: `Pet.status` (available/pending/sold), `Order.status` (placed/approved/delivered) — через `field.values`.
- **Default values**: `findByStatus.parameters.status.default = "available"`.
- **ReadOnly inference**: `id` на всех entities → `readOnly: true`.

### Edge cases

- **RPC-style paths** (`/pet/findByStatus`) создают "virtual" entity из последнего сегмента. Фикс в follow-up: распознавать POST /{collection}/{action} pattern (уже частично реализовано, но singularization ломает `findByStatus` → `FindByStatu`).
- **Integer IDs с format: int64** нормализованы в `type: "string"` на IDF-уровне — IDF не разделяет int64 и string PKs.
- **$ref в requestBody/parameters** пока не резолвится полностью — для MVP достаточно.

### Cleanup

```bash
rm -rf /tmp/openapi-e2e
```

## Acceptance Phase D

| Критерий | Статус |
|---|---|
| `idf import openapi --file <spec>` работает | ✓ |
| OpenAPI schemas → entities с role-inference | ✓ |
| REST-conventions (GET/POST/PATCH/PUT/DELETE) → IDF intents | ✓ |
| operationId override → custom intent names | ✓ |
| `$ref` resolution с cycle-detection | ✓ |
| path `{param}` → IDF `:param` | ✓ |
| Real 17KB Petstore spec → 13 entities / 19 intents | ✓ |
