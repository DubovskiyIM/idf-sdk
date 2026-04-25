/**
 * spec-vs-status-panels — двухпанельная раскладка desired (spec) vs observed
 * (status) для declarative reconciliation-систем.
 *
 * Promote'ится из argocd-pattern-batch (2026-04-24): flux-weave-gitops кандидат,
 * подтверждён ArgoCD (diff viewer) и Spinnaker (side-by-side version diff).
 * 3 независимых источника → high signal.
 *
 * Контекст: GitOps, K8s, Terraform, Flux/ArgoCD — декларативные системы,
 * где пользователь задаёт desired state (spec.replicas: 3, chart.version: 1.2)
 * и контроллер стремится reconcile его с observed state (status.availableReplicas: 2,
 * lastAppliedRevision: 1.1). Единая форма/таблица смешивает оба слоя, пользователь
 * не видит drift.
 *
 * Trigger: detail + mainEntity содержит обе группы полей:
 *   (a) ≥1 "spec" field — имя начинается с "spec." / содержит "Spec" / fieldRole: "spec"
 *       ИЛИ поля-группы в entity.groups с kind: "spec" / "desired" / "config"
 *   (b) ≥1 "status" field — имя начинается с "status." / fieldRole: "status" с values
 *       ИЛИ поля-группы в entity.groups с kind: "status" / "observed" / "live"
 *
 * Вместо строгих name-prefix (Kube-specific) используем два orthogonal signal:
 *   1. entity.groups[] с kind "spec" / "status"  — авторская аннотация (preferred)
 *   2. поле `spec` типа object + поле `status` типа object/string  — convention
 *
 * Apply: выставляет `slots.body.renderAs = { type: "specStatusSplit", specField,
 * statusField }` если body не переопределён. Renderer расширяет ArchetypeDetail
 * для этого renderAs.
 *
 * Backward-compat: если body уже имеет renderAs — no-op.
 *
 * Эталоны: Flux Kustomization detail (spec + status panels),
 * ArgoCD Application diff viewer (desired vs live),
 * Spinnaker deploy (cluster side-by-side version diff).
 */

const SPEC_GROUP_KINDS   = new Set(["spec", "desired", "config", "declared"]);
const STATUS_GROUP_KINDS = new Set(["status", "observed", "live", "current"]);

const SPEC_FIELD_NAMES   = new Set(["spec", "desired", "config", "declared", "template"]);
const STATUS_FIELD_NAMES = new Set(["status", "observed", "live", "state", "current"]);

function detectSpecStatusFields(entity) {
  const fields = entity?.fields;
  if (!fields || typeof fields !== "object") return null;

  // Priority 1: author-declared groups
  const groups = Array.isArray(entity.groups) ? entity.groups : [];
  const specGroup   = groups.find(g => SPEC_GROUP_KINDS.has(g.kind));
  const statusGroup = groups.find(g => STATUS_GROUP_KINDS.has(g.kind));
  if (specGroup && statusGroup) {
    return {
      specField:   specGroup.field || specGroup.id || "spec",
      statusField: statusGroup.field || statusGroup.id || "status",
      source: "groups",
    };
  }

  // Priority 2: convention — field named "spec" (object/any) + field named "status"
  let specField   = null;
  let statusField = null;
  for (const [name] of Object.entries(fields)) {
    if (!specField   && SPEC_FIELD_NAMES.has(name))   specField = name;
    if (!statusField && STATUS_FIELD_NAMES.has(name)) statusField = name;
  }
  if (specField && statusField) {
    return { specField, statusField, source: "convention" };
  }

  return null;
}

export default {
  id: "spec-vs-status-panels",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    /**
     * Matches: detail + mainEntity имеет оба слоя — spec (desired) и status (observed).
     */
    match(intents, ontology, projection) {
      if (projection?.archetype && projection.archetype !== "detail") return false;
      const mainEntity = projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity) return false;
      return detectSpecStatusFields(entity) !== null;
    },
  },
  structure: {
    slot: "body",
    description: "Для detail-entity с явными spec + status слоями выставляет body.renderAs = { type: 'specStatusSplit', specField, statusField }. Renderer делит body на два panel'а: 'Desired (Spec)' слева / 'Observed (Status)' справа. Author-override: no-op если body.renderAs уже задан.",
    apply(slots, context) {
      const { ontology, projection } = context;
      const body = slots?.body;
      if (!body) return slots;
      if (body.renderAs) return slots;
      // Author-override через projection.bodyOverride
      if (projection?.bodyOverride) return slots;
      const entity = ontology?.entities?.[projection?.mainEntity];
      if (!entity) return slots;
      const detected = detectSpecStatusFields(entity);
      if (!detected) return slots;

      return {
        ...slots,
        body: {
          ...body,
          renderAs: {
            type: "specStatusSplit",
            specField:   detected.specField,
            statusField: detected.statusField,
          },
        },
      };
    },
  },
  rationale: {
    hypothesis: "В декларативных reconciliation-системах (GitOps, K8s, Terraform) пользователю критично различать 'что я объявил' vs 'что контроллер видит сейчас'. Единая форма/таблица смешивает два слоя и скрывает drift. Двухпанельная раскладка делает divergence явной и снижает MTTR.",
    evidence: [
      { source: "Flux Weave GitOps", description: "Kustomization detail — Spec panel (source, path, interval, prune) + Status panel (lastApplied, conditions, ready)", reliability: "high" },
      { source: "ArgoCD Web UI", description: "Application detail: Parameters tab (desired) + Summary (live state) — пользователь явно переключает контекст", reliability: "high" },
      { source: "Spinnaker Deck", description: "Server group side-by-side: desired capacity + observed health", reliability: "high" },
      { source: "Kubernetes Dashboard", description: "Resource YAML view: spec объект + status объект — разделены в UI edit/view", reliability: "medium" },
    ],
    counterexample: [
      { source: "messenger / conversation", description: "Conversation не имеет spec/status split — нет reconciliation semantics", reliability: "high" },
      { source: "booking / appointment", description: "Appointment — single state lifecycle, не declarative reconciliation", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "argocd", projection: "application_detail", reason: "Application имеет spec + status поля (оба K8s CRD objects)" },
      { domain: "argocd", projection: "cluster_detail", reason: "Cluster имеет spec (config) + status (connectionState)" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "conversation_detail", reason: "Conversation без spec/status split" },
      { domain: "booking", projection: "specialist_detail", reason: "Specialist без reconciliation semantics" },
      { domain: "invest", projection: "portfolios_root", reason: "Catalog, не detail" },
    ],
  },
  _helpers: { detectSpecStatusFields },
};
