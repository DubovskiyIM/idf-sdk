---
"@intent-driven/core": minor
---

fix(crystallize_v2): default `collection` key для subCollection без override

`buildSection` в `assignToSlotsDetail` раньше брал `subDef.collection` буквально и возвращал `section.source = undefined`, если автор писал только `{entity, foreignKey, title}`. В renderer'е `SubCollectionSection` лукапил `ctx.world?.[undefined]` → empty list → секция показывала «(0)» даже когда rows в Φ есть.

Теперь, если `collection` не задан, фоллбэк на `camelPlural(entity)` (`Transaction → transactions`, `Category → categories`, `Glass → glasses`) — совпадает с host-side `foldEffects` / `filterWorldForRole.camelPluralize`. Author override остаётся priority — non-стандартные collection-ключи (e.g. `m2m-via` join entities) не ломаются.

Live impact: invest-portfolio-ai subCollection «Транзакции» рендерил `(0)` с 8 транзакциями в Φ; после fix'а каждая ontology без явного `collection` поля автоматически разрешается.
