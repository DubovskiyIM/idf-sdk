---
"@intent-driven/importer-openapi": minor
---

Importer теперь extract'ит request body schema fields в `intent.parameters` для POST / PUT / PATCH операций (было: только path params из URL).

Foundation для SDK FormModal auto-derive full form из intent metadata — host'ам можно drop'ать custom Create*/Edit*Dialog компоненты, рендеринг идёт через intent.parameters.

Server-set fields (`audit`, `id`, `createTime` / `createdAt`, `lastModifier`, `lastModifiedTime` и пр.) excluded — это backend-managed metadata, не должно быть в форме. `readOnly: true` поля тоже исключаются.

Body params получают marker `bodyParam: true` для distinguishing от path/query (path/query → URL substitution, body → request body JSON).

Path / body collision (rare — same field name): path wins (path identifies entity, body — это data).

Schema flatten'ится через `flattenSchema` — поддерживает `$ref`, `allOf`, single-variant `oneOf` / `anyOf`. Multi-variant `oneOf` — union over-approximation (все возможные поля, разумно для form-rendering).

Backward-compatible: existing intents просто получают дополнительные parameters; старые validations/exec продолжают работать. Opt-out через `importOpenApi(spec, { extractBodyParameters: false })`.
