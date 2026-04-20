# @intent-driven/cli

## 1.0.37

### Patch Changes

- Updated dependencies [fb47875]
  - @intent-driven/core@0.33.1

## 1.0.36

### Patch Changes

- Updated dependencies [4ebff4d]
  - @intent-driven/core@0.33.0

## 1.0.35

### Patch Changes

- Updated dependencies [d288926]
  - @intent-driven/core@0.32.0

## 1.0.34

### Patch Changes

- Updated dependencies [0fb39cb]
  - @intent-driven/core@0.31.2

## 1.0.33

### Patch Changes

- Updated dependencies [9a5388c]
  - @intent-driven/core@0.31.1

## 1.0.32

### Patch Changes

- Updated dependencies [4a2ef3e]
  - @intent-driven/core@0.31.0

## 1.0.31

### Patch Changes

- Updated dependencies [0d9883e]
  - @intent-driven/core@0.30.0

## 1.0.30

### Patch Changes

- Updated dependencies [ac0881a]
  - @intent-driven/core@0.29.0

## 1.0.29

### Patch Changes

- Updated dependencies [75b96ae]
  - @intent-driven/core@0.28.0

## 1.0.28

### Patch Changes

- Updated dependencies [0c866a7]
  - @intent-driven/core@0.27.0

## 1.0.27

### Patch Changes

- Updated dependencies [c8b40cf]
  - @intent-driven/core@0.26.0

## 1.0.26

### Patch Changes

- Updated dependencies [ddc222c]
  - @intent-driven/core@0.25.0

## 1.0.25

### Patch Changes

- Updated dependencies [8f6165b]
  - @intent-driven/core@0.24.0

## 1.0.24

### Patch Changes

- Updated dependencies [2e02b73]
  - @intent-driven/core@0.23.0

## 1.0.23

### Patch Changes

- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
- Updated dependencies [eb2954d]
  - @intent-driven/core@0.22.0

## 1.0.22

### Patch Changes

- Updated dependencies [265af59]
  - @intent-driven/core@0.21.0

## 1.0.21

### Patch Changes

- Updated dependencies [db67207]
  - @intent-driven/core@0.20.0

## 1.0.20

### Patch Changes

- Updated dependencies [e736b61]
  - @intent-driven/core@0.19.0

## 1.0.19

### Patch Changes

- Updated dependencies [d01d8de]
  - @intent-driven/core@0.18.0

## 1.0.18

### Patch Changes

- Updated dependencies [5a6429d]
  - @intent-driven/core@0.17.0

## 1.0.17

### Patch Changes

- Updated dependencies [a164717]
  - @intent-driven/core@0.16.0

## 1.0.16

### Patch Changes

- Updated dependencies [519b4b9]
  - @intent-driven/core@0.15.0

## 1.0.15

### Patch Changes

- Updated dependencies [01bc3a3]
  - @intent-driven/core@0.14.0

## 1.0.14

### Patch Changes

- Updated dependencies [2a0bc87]
  - @intent-driven/core@0.13.0

## 1.0.13

### Patch Changes

- Updated dependencies [0d49cdf]
  - @intent-driven/core@0.12.0

## 1.0.12

### Patch Changes

- Updated dependencies [988bfe4]
  - @intent-driven/core@0.11.0

## 1.0.11

### Patch Changes

- Updated dependencies [2827db9]
  - @intent-driven/core@0.10.1

## 1.0.10

### Patch Changes

- Updated dependencies [c413d3d]
  - @intent-driven/core@0.10.0

## 1.0.9

### Patch Changes

- Updated dependencies [9b8f413]
  - @intent-driven/core@0.9.1

## 1.0.8

### Patch Changes

- Updated dependencies [4142c3d]
  - @intent-driven/core@0.9.0

## 1.0.7

### Patch Changes

- Updated dependencies
  - @intent-driven/core@0.8.0

## 1.0.6

### Patch Changes

- Updated dependencies [7f60b09]
  - @intent-driven/core@0.7.2

## 1.0.5

### Patch Changes

- Updated dependencies [6f09f57]
  - @intent-driven/core@0.7.1

## 1.0.4

### Patch Changes

- Updated dependencies [b6a62e7]
  - @intent-driven/core@0.7.0

## 1.0.3

### Patch Changes

- Updated dependencies [daadd3d]
  - @intent-driven/core@0.6.0

## 1.0.2

### Patch Changes

- 550d9c2: feat(cli): validate.js ловит AnchoringError и печатает findings

  Если `crystallizeV2` в strict-режиме throw'ит `AnchoringError`, CLI теперь
  печатает каждый structural miss с actionable-подсказкой в stderr, затем
  re-throw. Это даёт автору сгенерированного домена чёткую диагностику: какой
  intent, какая частица, как исправить.

- Updated dependencies [550d9c2]
  - @intent-driven/core@0.5.1

## 1.0.1

### Patch Changes

- Updated dependencies [8b2c20e]
  - @intent-driven/core@0.5.0

## 1.0.0

### Major Changes

- e9432de: Первый публичный релиз `@intent-driven/cli@0.1.0` — CLI для bootstrap новых доменов IDF через интерактивный LLM-диалог.

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
