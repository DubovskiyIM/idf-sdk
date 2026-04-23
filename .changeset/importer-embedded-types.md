---
"@intent-driven/importer-openapi": minor
---

`markEmbeddedTypes` — orphan entities без intent.target/creates помечаются `kind: "embedded"` (G-K-3).

OpenAPI spec'ы часто определяют helper-schemas (AccessToken, AuthDetailsRepresentation, AbstractPolicyRepresentation, ...), нужные как $ref-target'ы в других schemas, но не покрытые HTTP endpoint'ами. Без маркера `kind:"embedded"` они попадают в ROOT_PROJECTIONS и создают nav-noise.

Новый step 5 в `importOpenApi` (после dedup):
1. Собираем set всех `intent.target` + `intent.creates`
2. Для каждой entity: если не в set И `kind: undefined | "internal"` → помечаем `kind: "embedded"`
3. Explicit kind'ы (`reference` / `assignment` / `mirror` / `embedded`) не переопределяются

Эффект Keycloak: 75 orphan'ов (44.6% entities) автоматически становятся embedded. Host `markOrphansEmbedded` helper в keycloak ontology.js становится X1 — удалить после bump.

## Options

- `opts.markEmbedded: false` — back-compat opt-out

## Exports

```js
import { markEmbeddedTypes } from "@intent-driven/importer-openapi";
```
