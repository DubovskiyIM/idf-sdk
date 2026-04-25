---
"@intent-driven/importer-openapi": minor
---

feat(importer-openapi): Swagger 2.0 native support — convertSwagger2 + importSpec

Закрывает §10.6 Phase B (ArgoCD G-A-6, 16-й полевой тест). Phase A (type-loss на nested $ref в schemaToEntity) уже был закрыт ранее.

## Что нового

### `convertSwagger2(spec, opts?)` — async helper

Тонкая обёртка над `swagger2openapi.convertObj` с дефолтами `patch: true`, `warnOnly: true`. Бросает если spec не Swagger 2.0.

### `isSwagger2(spec)` — detect-helper

Возвращает `true` для `{ swagger: "2.0" }`, false — для OpenAPI 3.x / null / non-object.

### `importSpec(source, opts?)` — async one-shot wrapper

```js
import { importSpec } from "@intent-driven/importer-openapi";

const swaggerJson = await fs.readFile("swagger.json", "utf-8");
const ontology = await importSpec(swaggerJson);
```

Auto-detect версии:

- `swagger:"2.0"` → конвертация через `convertSwagger2` → `importOpenApi`
- `openapi:"3.x"` → прямой `importOpenApi`
- string source → `parseSpec` → выше

Опции:

- `swagger2openapi: { patch?, warnOnly?, ... }` — пробрасывается в `convertObj` (если detected swagger 2.0)
- остальные opts передаются в `importOpenApi` (markEmbedded / inferFieldRoles / dedupRepresentations / etc.)

### Sync `importOpenApi` guard

Если в sync `importOpenApi` передать Swagger 2.0 — кидается понятная ошибка с подсказкой использовать `importSpec` / `convertSwagger2`. Раньше тихо deathmarchнулся в "string"-fallback на nested полях.

## Закрывает host workaround

`idf/scripts/argocd-reimport.mjs` — двухступенчатый flow `s2o.convertObj` + `importOpenApi` теперь сворачивается в один `await importSpec(...)`.

## Dependency

Добавлен `swagger2openapi: ^7.0.8` в `dependencies`. ~200KB, оправдано — закрывает класс enterprise / open-source API всё ещё на Swagger 2.0 (ArgoCD, gRPC-gateway, корпоративные REST).

## Test plan

- 13 новых тестов для `convertSwagger2` / `isSwagger2` / `importSpec` / sync-guard
- 188/188 green в `packages/importer-openapi` (+13 от 175)
