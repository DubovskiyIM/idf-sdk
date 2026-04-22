---
"@intent-driven/importer-openapi": minor
---

**Honor non-`{id}` path parameters в pathToIntent.**

До этого fix'а importer цеплял path-params **только** если они назывались `{id}`. Спеки с `{villager}`, `{fish}`, `{artwork}`, `{userId}/{postId}` и пр. — теряли все path-params и неправильно классифицировали GET одного ресурса как `list*` (вместо `read*`).

### Что изменилось

- Все `{name}` в path попадают в `intent.parameters[name] = { type: 'string', required: true }`.
- Семантика `read*` vs `list*`, `update*`, `remove*` теперь определяется по «заканчивается ли path на `/{...}`», а не по литералу `{id}`. Любое имя trailing-param — маркер row-id.
- Action paths (`/foo/{id}/approve`) — поведение сохранено, плюс `id` теперь тоже попадает в parameters.

### Pre/post на Nookipedia API (4393 LOC, 30+ paths с `{villager}/{fish}/{artwork}`)

- Intents: 17 → **32** (раньше `read*` коллидировали с `list*` под одним именем — оставалось одно)
- Intents с `parameters`: ~0 → **15**

### Backward compat

`{id}`-based specs продолжают работать без изменений (`/tasks/{id}` POST/PATCH/DELETE/GET — `read/update/remove/createTask` с `parameters.id`). Это **bug fix** (REST `/foo/{anything}` всегда был resource-read, не list), bumpим minor для безопасности.
