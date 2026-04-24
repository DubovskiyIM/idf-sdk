/**
 * grpc-gateway (используется ArgoCD, etcd, Prometheus API, gRPC ecosystem)
 * генерирует OpenAPI operationId в формате `<Service>_<VerbNoun>` —
 * `ApplicationService_Create`, `ClusterService_RotateAuth`,
 * `RepositoryService_ListRepositories`. Для IDF authoring это читается
 * неестественно: host-код и row-action resolver'ы ожидают canonical
 * verb-first convention (`createApplication`, `rotateClusterAuth`,
 * `listRepositories`) из Keycloak / Gravitino dogfood'а.
 *
 * Этот helper преобразует grpc-gateway operationId в canonical IDF имя:
 *   `ApplicationService_Create`        → `createApplication`
 *   `ApplicationService_Sync`          → `syncApplication`
 *   `ApplicationService_GetManifestsWithFiles` → `readApplicationManifestsWithFiles`
 *   `ClusterService_RotateAuth`        → `rotateClusterAuth`
 *   `RepositoryService_ListRepositories` → `listRepositories`  (plural dedup)
 *   `AccountService_CreateToken`       → `createAccountToken`
 *
 * Возвращает `null` если operationId не matches grpc-gateway pattern —
 * caller должен keep original operationId (не-gRPC OpenAPI).
 *
 * Closes ArgoCD G-A-7 (host `INTENT_RENAME` table становится removable).
 *
 * @param {string} operationId
 * @returns {string | null}
 */
const GRPC_PATTERN = /^(\w+?)Service_(\w+)$/;

// Canonical verb-mapping. HTTP-driven verbs → IDF conventions (read/remove),
// остальные (Sync, Rollback, Rotate, Invalidate, etc.) → lowercase as-is.
const VERB_MAP = {
  create: "create",
  list:   "list",
  get:    "read",
  update: "update",
  delete: "remove",
  patch:  "patch",
};

export function canonicalizeGrpcOperationId(operationId) {
  if (typeof operationId !== "string") return null;
  const m = operationId.match(GRPC_PATTERN);
  if (!m) return null;

  const entity = m[1];    // "Application" из "ApplicationService"
  const verbNoun = m[2];  // "Create" / "Sync" / "ListRepositories" / "RotateAuth"

  // Split CamelCase / PascalCase → parts.
  const parts = verbNoun.match(/[A-Z][a-z0-9]*|[A-Z]+(?=[A-Z]|$)/g);
  if (!parts || parts.length === 0) return null;

  const verbRaw = parts[0];
  const suffix = parts.slice(1).join("");
  const verbLower = verbRaw.toLowerCase();
  const verb = VERB_MAP[verbLower] || verbLower;

  // Plural-dedup: `ListRepositories` / `ListApplications` — когда suffix
  // совпадает с entity в plural форме, используем suffix как target вместо
  // `entity + suffix` (иначе `listRepositoryRepositories`).
  const pluralY   = entity.endsWith("y") ? entity.slice(0, -1) + "ies" : null;
  const pluralS   = entity + "s";
  const suffixIsEntityPlural =
    suffix === entity ||
    suffix === pluralS ||
    (pluralY && suffix === pluralY);

  const target = suffixIsEntityPlural
    ? suffix
    : (suffix.startsWith(entity) ? suffix : entity + suffix);

  return verb + target;
}
