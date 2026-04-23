---
"@intent-driven/importer-openapi": minor
---

Dedup X / XRepresentation пар при import'е (G-K-1 Keycloak + Gravitino G2).

OpenAPI spec'ы часто определяют envelope-типы через suffix (`XRepresentation` в Keycloak, `XSpec` / `XStatus` в K8s-style API). Path-derived entity — короткое имя `X`, schema-derived — `XRepresentation` с полным набором полей. Без dedup'а host видит две entity-записи в ontology, и intent.target указывает на почти пустой short-name.

Новый step 4 в `importOpenApi`:
1. Для каждой пары `X` / `X${suffix}` — мерджим fields + relations (rep приоритет — полный schema), удаляем long-name. Возвращаем aliases map
2. `rewriteReferencesByAliases` — все FK, ссылавшиеся на long-name, переписываются на short
3. `rewriteIntentTargetsByAliases` — intent.target / creates тоже aliased

Эффект на Keycloak: 224 → 199 entities (-25 dedup), Realm.fields 4 → 155, Client.fields 5 → 48, User.fields 3 → 29. Host-fix `mergeRepresentationDuplicates` в `idf/.worktrees/keycloak-dogfood/src/domains/keycloak/ontology.js` теперь можно удалить (X1).

## Options

- `opts.dedupRepresentations: false` — back-compat, отключает dedup
- `opts.representationSuffix: "Spec"` — custom suffix для K8s-стиля. Default `"Representation"`

## Exports

Helpers экспортируются отдельно для прямого вызова:
- `mergeRepresentationDuplicates(entities, opts) → { entities, aliases }`
- `rewriteReferencesByAliases(entities, aliases) → entities`
- `rewriteIntentTargetsByAliases(intents, aliases) → intents`
