---
"@intent-driven/core": minor
---

`normalizeIntentNative` теперь synthesize'ит `intent.creates` и `particles.effects` из flat-format (`α + target`), который эмитят scaffold-path и LLM-авторинг (studio PM chat). Без этого `deriveProjections` на flat-intents видел creators/mutators пустыми и не выводил R1 catalog / R3 detail — UI оставался без проекций даже при полной онтологии.

- `α: "create"` + `target: "Task"` → добавляет `creates: "Task"` и `particles.effects: [{ target: "Task", op: "create", α: "create" }]`.
- Любой `α + target` → добавляет соответствующий effect (`op: α`).
- Если автор уже задал `intent.creates` или `particles.effects` — не перезаписываем.

Host-workaround `enrichIntentsForDerive` в idf-studio можно удалить после bump'а.
