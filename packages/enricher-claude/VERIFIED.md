# End-to-end verification

**Дата:** 2026-04-21
**Ветка:** `feat/enricher-claude`

## Coverage

- **26 unit/integration тестов** (`pnpm -F @intent-driven/enricher-claude test`) — all green
- **Mock-subprocess integration** — full-flow `enrich()` с fake callClaude, проверяет cache, force, suggestion-apply
- **Manual E2E с real `claude` CLI** — ✓ пройден (см. ниже)

## Manual E2E

### Setup

Создана raw ontology с 4 entities (User / Order / OrderItem / Product), максимум семантики из Phase A importer'а:
- `is_active` boolean на Product (с inferred role `status-flag`)
- `is_admin` boolean на User (без inferred role — не префикс `is_`/`has_`, а полное slug)
- FK-graph с OrderItem → Order, OrderItem → Product
- Seed CRUD intents для Order

### Run

```bash
node ~/WebstormProjects/idf-sdk/packages/cli/src/cli.js \
  enrich --in raw-ontology.js --out enriched.js --no-review --force
```

### Output

```
→ Загружаю ontology из raw-ontology.js...
→ Запускаю claude subprocess...

Claude предложил 4 suggestions:
  namedIntents: 2
  absorbHints: 1
  baseRoles: 1

✓ Enriched: +2 intents, написано в enriched.js
```

### Suggestions, которые добавил Claude

1. **`activate_product`** — namedIntent с `__witness: "Boolean flag is_active на Product — toggle-driven state change, отдельный intent от generic update"`.
2. **`deactivate_product`** — inverse toggle.
3. **`absorbedBy: "Order_detail"`** на `OrderItem` — R8 Hub-absorption hint (FK + catalog child).
4. **`roles.admin: { base: "admin" }`** — из `is_admin` boolean на User. Заметно, что importer это НЕ определял (нет `is_`/`has_` префикса в owner-поле check'е + тип-independence от role-list), Claude поймал контекстный сигнал.

### Что именно Claude распознал, а importer нет

| Сигнал | Importer | Enricher |
|---|---|---|
| `is_active` → activate/deactivate intents (beyond CRUD) | ❌ только инферил role=`status-flag` | ✅ добавил intent-pair с reason'ом |
| OrderItem как child → absorb в Order_detail | ❌ только relation `belongs-to` | ✅ `absorbedBy` hint |
| `is_admin` column → base-role `admin` | ❌ | ✅ roles.admin |

### Subprocess details

CLI вызов: `claude -p --output-format json --append-system-prompt "<prompt>" --json-schema "<schema>"`.
`--bare` НЕ используется (потребовал бы `ANTHROPIC_API_KEY`; без него claude читает OAuth keychain).

Claude CLI не форсит JSON schema — modely возвращали prose до усиления system-prompt'а явным `КРИТИЧНО: Возвращай ТОЛЬКО валидный JSON`. После этого стабильно отвечает JSON'ом. Fallback `extractJson()` поддерживает markdown-fence и first-`{`/last-`}` strategies на случай drift'а.

### Cleanup

```bash
rm -rf /tmp/enrich-test
```

## Acceptance Phase B

| Критерий | Статус |
|---|---|
| `idf enrich` работает | ✓ |
| `--enrich` flag в `idf import postgres` | ✓ |
| Real claude CLI subprocess (не Anthropic SDK) | ✓ |
| Structured output → applied в ontology | ✓ (4 suggestions на 4-entity schema) |
| Prompt-cache (skip повторных вызовов) | ✓ (cached=true на втором run'е) |
| Author-transparent witness-комментарии | ✓ (`__witness` field на каждом enriched-intent) |
