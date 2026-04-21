---
"@intent-driven/importer-postgres": minor
"@intent-driven/importer-prisma": minor
---

**Importers автоматически выводят R9 compositions из FK-relations** (Workzilla dogfood findings §8.7).

Раньше importer'ы (postgres / prisma) эмитили `entity.relations[fkField] = {entity, kind:"belongs-to"}`, но НЕ `ontology.compositions`, которые нужны `crystallize_v2` для R9 auto-resolve в detail-views (task_detail показывает task.customer.name / task.responses).

Автор был вынужден вручную дополнять compositions после import'а — иначе detail-витнессы с dotted-путями (`customer.name`, `responses.count`) ломались.

**Новый shared helper `buildCompositions(entities)`** (postgres + prisma — копия для independency):

Для каждого `child.relations[fk] = {entity: Parent, kind: "belongs-to"}` эмитит двустороннюю связь:
- `compositions.Child: [{ entity: Parent, as: <fk-без-Id>, via: fk, mode: "one" }]`
- `compositions.Parent: [{ entity: Child, as: <child-plural>, via: fk, mode: "many" }]`

Пример: `Task.customerId → User`:
- `compositions.Task: [{ entity:"User", as:"customer", via:"customerId", mode:"one" }]`
- `compositions.User: [{ entity:"Task", as:"tasks", via:"customerId", mode:"many" }]`

Алиасы: camelCase `customerId → customer`, snake_case `user_id → user`, plural `Category → categories`.

Интегрировано в `buildOntology` (postgres) и `importPrisma` (prisma) — compositions попадают в `ontology.compositions`, если хоть одно belongs-to найдено. Пустой случай — не добавляется (no-op для ontology без FK).

Тесты: 7 новых unit (buildCompositions) + проверка в postgres `buildOntology.test.js` что compositions выведены двусторонне. Остальные 100 importer-тестов — без изменений.
