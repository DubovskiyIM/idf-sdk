/**
 * global-scope-picker — header-level scope-switcher для multi-tenant/cluster admin.
 *
 * В multi-tenant/cluster/realm системах большинство данных «принадлежат»
 * одной scope-entity (Cluster, Project, Realm, Workspace и т.п.). Sidebar-фильтр
 * требует O(n) кликов при переключении контекста — один per-sidebar per-projection.
 * Header-picker даёт O(1): один глобальный switch, применяется ко всем projection'ам.
 *
 * Эталоны:
 *   - Rancher Manager: cluster-picker в global header (любая страница знает «в каком
 *     кластере» ты сейчас)
 *   - ArgoCD: project filter в header — все application/repo/cert views scoped
 *   - Kubernetes Dashboard: namespace picker — top-level, не per-page
 *   - Keycloak: realm switcher в sidebar-header — весь admin scoped под realm
 *
 * Promote'ится из rancher-manager-global-scope-picker candidate (2026-04-24).
 * Связан с ArgoCD dogfood backlog §10 G-A-1 (Project-scoped projections).
 */

/**
 * Имена entity, которые по convention являются scope-entity.
 * Матч по exact или substring (case-insensitive).
 */
const SCOPE_NAME_PATTERNS = [
  /^tenant$/i,
  /^cluster$/i,
  /^workspace$/i,
  /^realm$/i,
  /^namespace$/i,
  /^project$/i,
  /^environment$/i,
  /^organization$/i,
  /^org$/i,
];

/**
 * Humanize entity name → label.
 * "argoProject" → "Argo Project"
 */
function humanize(key) {
  const s = key.replace(/([A-Z])/g, " $1").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Ищет «scope entity» в ontology.
 * Приоритет (убывающий):
 *   1. entity с isScope: true (explicit author signal)
 *   2. entity с kind === "reference" (IDF ontology kind)
 *   3. entity с role.base === "reference" (alternate convention)
 *   4. entity, имя которой совпадает с SCOPE_NAME_PATTERNS
 *
 * Возвращает { name, entity } | null.
 */
function findScopeEntity(ontology) {
  if (!ontology?.entities || typeof ontology.entities !== "object") return null;

  // Pass 1: explicit isScope signal
  for (const [name, entity] of Object.entries(ontology.entities)) {
    if (entity?.isScope === true) return { name, entity };
  }

  // Pass 2: kind === "reference" (IDF ontology taxonomy)
  for (const [name, entity] of Object.entries(ontology.entities)) {
    if (entity?.kind === "reference") return { name, entity };
  }

  // Pass 3: role.base === "reference"
  for (const [name, entity] of Object.entries(ontology.entities)) {
    if (entity?.role?.base === "reference") return { name, entity };
  }

  // Pass 4: naming convention
  for (const [name, entity] of Object.entries(ontology.entities)) {
    for (const pat of SCOPE_NAME_PATTERNS) {
      if (pat.test(name)) return { name, entity };
    }
  }

  return null;
}

/**
 * Считает сколько entities (кроме scope entity) имеют FK-поле на scope entity.
 * FK-convention: поле named `<scopeLower>Id` (e.g. clusterId, projectId, realmId).
 *
 * Дополнительно учитываем:
 *   - поле с `references === scopeName`
 *   - поле с `entityRef` type и name содержащим scopeLower
 */
function countScopedEntities(ontology, scopeName) {
  if (!ontology?.entities || !scopeName) return 0;
  const scopeLower = scopeName.charAt(0).toLowerCase() + scopeName.slice(1);
  const fkField = `${scopeLower}Id`;

  let count = 0;
  for (const [entityName, entity] of Object.entries(ontology.entities)) {
    if (entityName === scopeName) continue;
    if (!entity?.fields || typeof entity.fields !== "object") continue;

    for (const [fieldName, fieldDef] of Object.entries(entity.fields)) {
      // Convention: <scopeLower>Id field
      if (fieldName === fkField) { count++; break; }
      // Explicit references annotation
      if (fieldDef?.references === scopeName) { count++; break; }
      // entityRef field whose name contains scopeLower
      if (
        (fieldDef?.type === "entityRef" || fieldDef?.kind === "entityRef") &&
        fieldName.toLowerCase().includes(scopeLower)
      ) { count++; break; }
    }
  }
  return count;
}

export default {
  id: "global-scope-picker",
  version: 1,
  status: "stable",
  archetype: null, // cross-cutting — shell/navigation level
  trigger: {
    requires: [],
    /**
     * Match: в ontology есть ≥1 scope entity (по kind/isScope/naming convention)
     * И ≥3 других entities имеют FK-зависимость от неё.
     *
     * OR: хотя бы один projection явно объявляет `projection.scope` — тогда
     * scope entity deduce из первого такого projection.
     */
    match(intents, ontology, projection) {
      // Projection-level explicit scope → always match
      if (projection?.scope) return true;

      const found = findScopeEntity(ontology);
      if (!found) return false;

      const depCount = countScopedEntities(ontology, found.name);
      return depCount >= 3;
    },
  },
  structure: {
    slot: "header",
    description:
      "Дополняет slots.header полем scopePicker: { entity, label } — сигнал renderer'у " +
      "что в shell-header нужен dropdown/combobox для переключения scope-entity. " +
      "Author-override: no-op если scopePicker уже задан в slots.header. " +
      "Projection-level scope override: если projection.scope → entity берётся оттуда.",
    /**
     * Apply: добавляет `scopePicker` в slots.header.
     *
     * Idempotent: если scopePicker уже присутствует — no-op.
     * No-op: если scope entity не найдена.
     *
     * scopePicker structure:
     *   { entity: string, label: string, source: "derived:global-scope-picker" }
     */
    apply(slots, context) {
      const { ontology, projection } = context || {};

      // §13b (Notion field-test 2026-04-27) — slots.header per
      // assignToSlots* контракт инициализируется как array. До fix'а apply
      // превращал header в object со scopePicker key — это ломало
      // ArchetypeDetail/Catalog SlotRenderer (items.map is not a function).
      const headerNodes = Array.isArray(slots?.header) ? slots.header : [];
      const alreadyAdded =
        headerNodes.some((n) => n?.type === "scopePicker") ||
        // legacy: scopePicker как object-key (pre-fix) — рассматриваем
        // как already-set, чтобы не двойного render'а.
        (slots?.header && typeof slots.header === "object" && !Array.isArray(slots.header) && slots.header.scopePicker);
      if (alreadyAdded) return slots;

      let scopeName = null;
      let scopeLabel = null;

      // Projection-level explicit scope (e.g. projection.scope = "Cluster")
      if (projection?.scope) {
        scopeName = projection.scope;
        const entity = ontology?.entities?.[scopeName];
        scopeLabel = entity?.label || humanize(scopeName);
      } else {
        const found = findScopeEntity(ontology);
        if (!found) return slots;
        const depCount = countScopedEntities(ontology, found.name);
        if (depCount < 3) return slots;
        scopeName = found.name;
        scopeLabel = found.entity?.label || humanize(scopeName);
      }

      if (!scopeName) return slots;

      return {
        ...slots,
        header: [
          ...headerNodes,
          {
            type: "scopePicker",
            entity: scopeName,
            label: scopeLabel,
            source: "derived:global-scope-picker",
          },
        ],
      };
    },
  },
  rationale: {
    hypothesis:
      "Когда 80%+ namespaced projection'ов живут под одним discriminator " +
      "(tenant/cluster/workspace/realm), обычный sidebar-фильтр требует O(n) кликов " +
      "при переключении контекста. Header-picker даёт O(1) переключение — " +
      "глобальный scope применяется ко всем view автоматически.",
    evidence: [
      {
        source: "Rancher Manager",
        description: "Cluster picker в global header — весь admin UI scoped под выбранный cluster",
        reliability: "high",
      },
      {
        source: "ArgoCD",
        description: "Project filter в header — applications/repositories/certificates scoped под project",
        reliability: "high",
      },
      {
        source: "Kubernetes Dashboard",
        description: "Namespace picker в top header — все resources scoped под namespace",
        reliability: "high",
      },
      {
        source: "Keycloak Admin Console",
        description: "Realm switcher в sidebar-header — весь admin scoped под realm",
        reliability: "high",
      },
      {
        source: "Grafana",
        description: "Organization switcher в header — dashboards/alerts/teams scoped под org",
        reliability: "high",
      },
    ],
    counterexample: [
      {
        source: "lifequest / single-user domain",
        description: "Нет shared scope — один пользователь, нет tenant/cluster/realm entities",
        reliability: "high",
      },
      {
        source: "booking domain",
        description: "Booking — user-scoped, нет общего scope discriminator'а",
        reliability: "high",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      {
        domain: "argocd",
        projection: "applications_list",
        reason: "Project — scope entity с kind='reference', 4+ entities (Application/Cluster/Repository/Certificate) scoped под Project",
      },
      {
        domain: "keycloak",
        projection: "clients_list",
        reason: "Realm — scope entity, все keycloak entities (Client/User/Group/Role) scoped под Realm",
      },
    ],
    shouldNotMatch: [
      {
        domain: "lifequest",
        projection: "dashboard",
        reason: "Single-user, нет shared scope entity — нет Tenant/Cluster/Workspace/Realm/Namespace/Project",
      },
      {
        domain: "planning",
        projection: "my_polls",
        reason: "Poll-домен не имеет scope discriminator — <3 scoped entities под какую-либо scope entity",
      },
    ],
  },
  // Helpers exported для тестов и reuse
  _helpers: { findScopeEntity, countScopedEntities, humanize },
};
