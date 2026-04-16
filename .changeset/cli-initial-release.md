---
"@intent-driven/cli": major
---

Первый публичный релиз `@intent-driven/cli@0.1.0` — CLI для bootstrap новых доменов IDF через интерактивный LLM-диалог.

Команда `idf init <name>` ведёт 5-шаговый диалог с Claude (haiku/sonnet/opus на выбор):

1. Описание домена (1-2 предложения от автора).
2. Сущности — Claude предлагает 3-7 entity на основе описания.
3. Роли с base (owner/viewer/agent/observer).
4. Намерения — Claude выводит 8-15 атомарных интентов; multiselect.
5. Генерация файлов + self-validation через `crystallizeV2`.

Артефакт — каталог `<name>/` с `domain.js` (ontology + intents + projections как map'ы), `seed.js` (стартовый мир), `test/crystallize.test.js`, `package.json`, `README.md`. После `cd <name> && npm install && npm test` — всё зеленеет.

System prompt с компактной IDF-spec кешируется через Anthropic prompt caching (>90% скидка на повторные шаги).

Скоп v0.1: только команда `init`. Планы на v0.2 — `add intent`, `validate <path>` через conformance-тесты.

Тесты: 20/20 (templates + e2e с реальным `crystallizeV2` без сети).
