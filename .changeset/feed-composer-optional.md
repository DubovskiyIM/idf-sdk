---
"@intent-driven/core": patch
"@intent-driven/renderer": patch
---

fix(validateArtifact): composer не обязателен для feed

`feed` архетип требовал `slots.composer` в `REQUIRED_SLOTS_BY_ARCHETYPE` в
двух местах (core + renderer). Это наследство messenger chat-кейса: там
composer всегда присутствует через `send_message` intent с
`confirmation:"enter" + creates:"Message"`.

Для любого другого feed (R11 temporal public, R11 v2 owner-scoped, любая
read-only временная лента) intent'а с `confirmation:"enter"` нет,
`assignToSlotsFeed` возвращает `slots.composer = null`, и validateArtifact
блокирует рендер.

Это ломало:
- `reflect.insights_feed` (authored) — уже упало в main до этой правки,
  но было не замечено, т.к. reflect редко открывался в браузере.
- `reflect.my_insight_feed` (R11 v2 derived, после активации в idf#70) —
  уже в artifacts, но не рендерился.

Снято: `REQUIRED_SLOTS_BY_ARCHETYPE.feed = ["body"]`. Composer — особенность
messenger chat, не инвариант feed-архетипа.

Тесты: "требует composer для feed" заменён на "composer необязателен для feed".
888/175 passed без регрессий.
