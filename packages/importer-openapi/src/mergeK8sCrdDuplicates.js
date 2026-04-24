/**
 * Kubernetes Custom Resources в OpenAPI schemas часто именуются как
 * `v<digits>(alpha|beta)?<digits>?<Name>` — `v1alpha1Application`,
 * `v1beta1Cluster`, `v2HorizontalPodAutoscaler`. Importer создаёт две
 * раздельные entities:
 *   - path-derived stub `Application` (fields:{id}, kind:"internal") из
 *     `/api/v1/applications/{name}` через `entityNameFromPath`
 *   - schema-derived `v1alpha1Application` (все поля, kind:"embedded" из-за
 *     markEmbeddedTypes — wrapper `v1alpha1ApplicationList` референсит его)
 *
 * Intents.creates="Application" → dangling reference на stub. Host
 * обходит через явные merge-таблицы (ArgoCD `K8S_CRD_MERGE` в 10 pairs).
 *
 * Этот helper автоматизирует pattern'ы типа `v<ver><PascalName>` с точным
 * match'ем short-name (case-insensitive для PascalCase mismatch'а вроде
 * `Applicationset` стаба vs `ApplicationSet` schema). Merge:
 *   - stub.id побеждает (синтетический PK)
 *   - full.fields заполняют все недостающие поля
 *   - kind переводится в "internal" (stub был top-level через path)
 *   - full остаётся в entities под оригинальным именем для wrapper-refs
 *     (`v1alpha1ApplicationList.items[]` → `v1alpha1Application`). Author
 *     может opt-in через `opts.stripOriginal: true` + rewrite references.
 *
 * Не handled автоматически (требуют host-override):
 *   - Name mismatch: `Project` (path) ← `v1alpha1AppProject` (schema)
 *   - Semantic alias: `Gpgkey` (path) ← `v1alpha1GnuPGPublicKey`
 *
 * Closes ArgoCD G-A-1 (sdk-improvements-backlog §10).
 *
 * @param {Record<string, object>} entities
 * @param {object} [opts]
 * @param {boolean} [opts.stripOriginal=false] — удалить v<ver><Name> после merge
 * @returns {{ entities: Record<string, object>, aliases: Record<string, string> }}
 */
const K8S_VERSION_RE = /^v\d+(?:alpha\d*|beta\d*)?([A-Z]\w+)$/;

export function mergeK8sCrdDuplicates(entities, opts = {}) {
  const stripOriginal = !!opts.stripOriginal;
  const result = { ...entities };
  const aliases = {};

  // Быстрый lookup существующих entity ключей case-insensitive для PascalCase
  // mismatch (`Applicationset` vs `ApplicationSet`).
  const ciIndex = new Map();
  for (const key of Object.keys(result)) {
    ciIndex.set(key.toLowerCase(), key);
  }

  for (const longName of Object.keys(entities)) {
    const m = longName.match(K8S_VERSION_RE);
    if (!m) continue;

    const schemaName = m[1]; // "Application" из "v1alpha1Application"
    const stubKey = ciIndex.get(schemaName.toLowerCase());
    if (!stubKey || stubKey === longName) continue;

    const stub = result[stubKey];
    const full = result[longName];
    if (!stub || !full) continue;

    // Merge: stub.fields имеют приоритет (id-stub), full заполняет остальное
    result[stubKey] = {
      ...full,
      ...stub,
      name: stub.name || stubKey,
      fields: { ...(full.fields || {}), ...(stub.fields || {}) },
      relations: { ...(full.relations || {}), ...(stub.relations || {}) },
      kind: "internal",
    };
    aliases[longName] = stubKey;

    if (stripOriginal) {
      delete result[longName];
    }
  }

  return { entities: result, aliases };
}
