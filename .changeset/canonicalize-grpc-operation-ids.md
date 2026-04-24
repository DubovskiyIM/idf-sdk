---
"@intent-driven/importer-openapi": minor
---

feat(importer-openapi): canonicalize grpc-gateway operationIds (default on)

grpc-gateway (ArgoCD, etcd, Prometheus API, gRPC-backed OpenAPI) генерирует
operationId в формате `<Entity>Service_<VerbNoun>` — `ApplicationService_
Create`, `ClusterService_RotateAuth`, `RepositoryService_ListRepositories`.
IDF авторинг ожидает canonical verb-first (`createApplication`,
`rotateClusterAuth`, `listRepositories`) — совпадает с Keycloak / Gravitino
convention.

`pathToIntent` теперь автоматически canonicalize'ит grpc-gateway operationId
через новый helper `canonicalizeGrpcOperationId`. Non-grpc operationId
(без `Service_` pattern) остаются as-is — safe default.

Opt-out: `importOpenApi(spec, { canonicalizeGrpcOperationIds: false })`.

Semantics:
  ApplicationService_Create             → createApplication
  ApplicationService_Sync               → syncApplication
  ApplicationService_GetManifestsWithFiles → readApplicationManifestsWithFiles
  ClusterService_RotateAuth             → rotateClusterAuth
  RepositoryService_ListRepositories    → listRepositories  (plural dedup)
  AccountService_CreateToken            → createAccountToken

Verb mapping CRUD → IDF: Create/List/Get/Update/Delete/Patch →
create/list/read/update/remove/patch. Остальные verbs (Sync/Rollback/
Rotate/Invalidate) — lowercase as-is.

Closes ArgoCD G-A-7 (host `INTENT_RENAME` table становится removable).
