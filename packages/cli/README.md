# @intent-driven/cli

CLI для bootstrap новых доменов в парадигме [Intent-Driven Frontend](https://github.com/DubovskiyIM/idf) через интерактивный LLM-диалог.

## Установка и запуск

Без установки, через npx:

```bash
ANTHROPIC_API_KEY=sk-ant-... npx @intent-driven/cli init my-domain
```

Или глобально:

```bash
npm install -g @intent-driven/cli
export ANTHROPIC_API_KEY=sk-ant-...
idf init my-domain
```

API-ключ Claude получить: <https://console.anthropic.com/>

## Что делает `idf init <name>`

Ведёт короткий диалог из 5 шагов:

1. **Описание домена** — 1-2 предложения от тебя.
2. **Сущности** — Claude предлагает 3-7 ключевых entity на основе описания.
3. **Роли** — Claude предлагает 1-3 роли с base (`owner` / `viewer` / `agent` / `observer`).
4. **Намерения** — Claude выводит 8-15 атомарных интентов; ты multiselect-ом оставляешь нужные.
5. **Генерация** — пишет файлы и валидирует через `crystallizeV2`.

На выходе — каталог `<name>/` с готовой стартовой структурой:

```
<name>/
  domain.js                  ─ ontology + intents + projections
  seed.js                    ─ начальный мир для smoke-тестов
  test/crystallize.test.js   ─ vitest-проверки
  package.json               ─ зависимости (@intent-driven/core, vitest)
  README.md                  ─ описание домена
```

После `cd <name> && npm install && npm test` — всё должно зеленеть.

## Опции

```
idf init <name> [options]

  -m, --model     LLM-модель: haiku | sonnet | opus  (default: sonnet)
  -o, --out       Каталог для генерации               (default: ./<name>)
  -h, --help
  -v, --version
```

Модели:

- `haiku` (Claude Haiku 4.5) — самая быстрая и дешёвая, для простых доменов
- `sonnet` (Claude Sonnet 4.6) — баланс качества и скорости (default)
- `opus` (Claude Opus 4.6) — лучшее качество для сложных domain'ов

## Подключение сгенерированного домена к прототипу

В клонированном [`DubovskiyIM/idf`](https://github.com/DubovskiyIM/idf):

1. Скопируй каталог `<name>/` в `src/domains/<name>/`.
2. Зарегистрируй в `src/prototype.jsx` как новый пункт переключателя:
   ```js
   import myDomainDef from "./domains/my-domain/domain.js";
   import myDomainSeed from "./domains/my-domain/seed.js";
   // … добавить в DOMAINS / SEEDS map
   ```
3. `npm run dev` — твой домен станет доступен через переключатель в шапке.

## Что считается «сгенерированным»

CLI **не угадывает бизнес-логику**. То, что он генерирует — каркас, который:

- Проходит `crystallizeV2` без ошибок.
- Имеет corretные типы полей (`money`, `datetime`, `boolean`, `entityRef` выводятся из имён).
- Имеет правильную структуру `particles` в каждом intent'е.
- Генерирует базовый набор `catalog`+`detail` проекций для каждой non-reference entity.

Что **не генерируется** автоматически:

- Условия (`conditions`) — нужно добавить вручную, `Claude` их не выводит без знания бизнес-правил.
- Кастомные projections — `dashboard`, `wizard`, `canvas` (только catalog/detail из коробки).
- Многосущностные effects (например, batch-изменения) — простые add/replace/remove.

После генерации домен — стартовая точка для итеративной правки.

## Скоп v1.0

В этой версии — только команда `init`. В планах для следующих минорных:

- `idf add intent <name>` — добавить намерение к существующему домену
- `idf validate <path>` — прогон conformance-тестов из spec
- Поддержка не-Anthropic LLM (OpenAI, локальные)

Issues / feature requests: <https://github.com/DubovskiyIM/idf-sdk/issues>

## Лицензия

MIT.
