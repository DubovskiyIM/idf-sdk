---
"@intent-driven/importer-openapi": minor
---

feat(importer-openapi): preserve $ref field type в propertyToField (10.6)

Ранее propertyToField видел property с `{ $ref: "#/..." }` и fallback'ил
в `type: "string"` потому что `schema.type` был undefined. Это теряло
семантику nested object полей (K8s pattern: `metadata: $ref v1.ObjectMeta`,
`spec: $ref ApplicationSpec`, `status: $ref ApplicationStatus`).

Fix: propertyToField принимает `opts.spec` для recursive $ref resolution
через flattenSchema. Возвращает:
  - `type: "json"` если $ref → object-schema (nested object / array of
    objects / allOf-flattened composition)
  - `type: "string"` / `"number"` / etc. если $ref → primitive schema
  - `type: "json"` fallback для unresolved $ref без spec (безопаснее чем
    string, поскольку $ref семантически всегда на другую schema)

Для array-of-$ref: `type: "json"` + `itemsType: "object"` hint для
downstream renderer.

schemaToEntity теперь принимает `opts.spec` и прокидывает в
propertyToField. importOpenApi автоматически передаёт spec.

Backward compat: propertyToField без opts работает как раньше для
не-$ref случаев (primitive types / inline object). Изменяется только
поведение для unresolved $ref (был string, стал json — более корректно).

Closes ArgoCD G-A-6 / backlog §10.6 (Swagger 2.0 → OpenAPI 3.0
конверсия через swagger2openapi теряла тип-info для $ref-полей; host
SEMANTIC_AUGMENT workaround теперь может быть уменьшен).
