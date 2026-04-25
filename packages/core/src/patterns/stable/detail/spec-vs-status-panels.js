/**
 * spec-vs-status-panels — двухпанельный split: declarative/observed state.
 *
 * Промоция из flux-weave-gitops candidate (2026-04-24) → stable (2026-04-25)
 * в рамках ArgoCD dogfood sprint.
 *
 * В декларативных reconciliation-системах (GitOps, Kubernetes, Terraform)
 * пользователю критично различать «что я задекларировал» (spec) vs «что
 * контроллер применил» (status). Плоский form-like detail скрывает drift
 * между desired state и observed state — split-panel делает drift first-class
 * сигналом.
 *
 * Trigger: detail-archetype + mainEntity имеет ≥1 spec-like поле (fieldRole
 * === "spec" ИЛИ имя из spec-словаря: spec, desired, sourceRef, targetRevision,
 * path, interval, chartVersion) И ≥1 status-like поле (fieldRole === "status"
 * ИЛИ имя из status-словаря: status, conditions, lastAppliedRevision,
 * lastAttemptedRevision, currentRevision, phase, message, observedGeneration).
 *
 * Apply: аугментирует slots.body через body.layout = "spec-status-split" +
 * body.specFields / body.statusFields. Renderer использует это для
 * двухпанельного отображения (spec = editable, status = readonly).
 * No-op если body.layout уже задан (author-override).
 *
 * Эталоны: Flux Weave GitOps Kustomization/HelmRelease detail,
 * ArgoCD Application summary+parameters vs events+conditions,
 * kubectl describe Spec:/Status: структура.
 */

// Spec-field names (authored/declarative state)
const SPEC_NAME_HINTS = new Set([
  "spec", "desired", "sourceRef", "targetRevision", "path", "interval",
  "chartVersion", "repoURL", "targetCluster", "valuesFrom", "template",
  "definition", "blueprint", "config", "configuration", "parameters",
  "desiredReplicas", "desiredState",
]);

// Status-field names (observed/runtime state)
const STATUS_NAME_HINTS = new Set([
  "status", "conditions", "lastAppliedRevision", "lastAttemptedRevision",
  "currentRevision", "phase", "message", "observedGeneration", "health",
  "syncStatus", "reconciledAt", "failureMessage", "readyReplicas",
  "availableReplicas", "lastTransitionTime", "lastUpdateTime",
]);

/**
 * Возвращает массив имён spec-like полей из entity.fields.
 * Учитывает fieldRole === "spec" или совпадение с SPEC_NAME_HINTS.
 */
export function detectSpecFields(entity) {
  const fields = entity?.fields;
  if (!fields || typeof fields !== "object") return [];
  const result = [];
  for (const [name, def] of Object.entries(fields)) {
    if (!def) continue;
    if (def.fieldRole === "spec") {
      result.push(name);
      continue;
    }
    if (SPEC_NAME_HINTS.has(name)) {
      result.push(name);
    }
  }
  return result;
}

/**
 * Возвращает массив имён status-like полей из entity.fields.
 * Учитывает fieldRole === "status" или совпадение с STATUS_NAME_HINTS.
 */
export function detectStatusFields(entity) {
  const fields = entity?.fields;
  if (!fields || typeof fields !== "object") return [];
  const result = [];
  for (const [name, def] of Object.entries(fields)) {
    if (!def) continue;
    if (def.fieldRole === "status") {
      result.push(name);
      continue;
    }
    if (STATUS_NAME_HINTS.has(name)) {
      result.push(name);
    }
  }
  return result;
}

export default {
  id: "spec-vs-status-panels",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    /**
     * Matches: detail-archetype + mainEntity содержит ≥1 spec-like field
     * И ≥1 status-like field.
     *
     * Spec-like: fieldRole === "spec" || имя в SPEC_NAME_HINTS
     * Status-like: fieldRole === "status" || имя в STATUS_NAME_HINTS
     */
    match(intents, ontology, projection) {
      if (projection?.archetype && projection.archetype !== "detail") return false;
      const mainEntity = projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity?.fields || typeof entity.fields !== "object") return false;

      const specFields = detectSpecFields(entity);
      if (specFields.length === 0) return false;

      const statusFields = detectStatusFields(entity);
      return statusFields.length > 0;
    },
  },
  structure: {
    slot: "body",
    description: "Аугментирует slots.body: устанавливает body.layout = 'spec-status-split', body.specFields = [...field names], body.statusFields = [...field names]. Renderer использует это для двухпанельного рендера: spec-панель (editable, declarative) и status-панель (readonly, observed). No-op если body.layout уже задан (author-override).",
    /**
     * Apply: если body.layout не задан — выставляет spec-status-split layout
     * с разбивкой полей по specFields / statusFields.
     * Author-override: body.layout уже задан → no-op.
     * Idempotent: повторное применение безопасно.
     */
    apply(slots, context) {
      const { projection, ontology } = context;
      const body = slots?.body;
      if (!body) return slots;
      // Author-override: если layout уже задан — не вмешиваемся.
      if (body.layout) return slots;

      const mainEntity = projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity) return slots;

      const specFields = detectSpecFields(entity);
      const statusFields = detectStatusFields(entity);

      // Нужно хотя бы по одному полю в каждой группе для split-panel.
      if (specFields.length === 0 || statusFields.length === 0) return slots;

      return {
        ...slots,
        body: {
          ...body,
          layout: "spec-status-split",
          specFields,
          statusFields,
        },
      };
    },
  },
  rationale: {
    hypothesis: "В декларативных reconciliation-системах (GitOps, K8s, Terraform) пользователю критично различать «что я декларировал» (spec) vs «что контроллер применил» (status). Плоский form-like detail скрывает drift между desired state и observed state. Split-panel делает drift first-class сигналом и задаёт правильный permission-контекст: spec = editable, status = readonly-derived.",
    evidence: [
      { source: "Flux Weave GitOps", description: "Kustomization/HelmRelease detail: левая панель Spec (sourceRef, path, interval), правая — Status (lastAppliedRevision, conditions, message). Разная типографика и цветовой вес.", reliability: "high" },
      { source: "ArgoCD Web UI", description: "Application detail: Summary+Parameters (spec) отделены от Events+Conditions (observed). Tabs Summary/Parameters vs Events/Conditions — функциональный аналог split-panel.", reliability: "high" },
      { source: "kubectl describe", description: "CLI-вывод structured как Spec: {...} / Status: {...} — стандарт de-facto для K8s reconciliation output; textual аналог split-panel.", reliability: "high" },
      { source: "Terraform Cloud", description: "Workspace run detail: configuration input (spec) vs plan/apply output (status) — чёткий split.", reliability: "high" },
      { source: "Rancher Manager", description: "Workload detail: Configuration tab (spec) vs Status section (observed replicas, conditions).", reliability: "medium" },
    ],
    counterexample: [
      { source: "Trello", description: "Card detail не имеет spec/status разделения — нет reconciliation model; authored == actual. Split-panel не нужен.", reliability: "high" },
      { source: "Jira Issue", description: "Issue view: все поля authored; Status — просто enum-поле, не derived от контроллера.", reliability: "high" },
      { source: "Messenger / Conversation", description: "Conversation.messages — authored state == actual state; нет declarative/observed split.", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "workflow", projection: "execution_detail", reason: "Execution имеет spec-поля (config, template) и status-поля (phase, conditions) — классический reconciliation split." },
      { domain: "argocd", projection: "application_detail", reason: "Application: spec (targetRevision, sourceRef) + status (currentRevision, health, syncStatus, conditions)." },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "conversation_detail", reason: "Нет declarative/observed split — authored state == actual state; нет spec/status полей." },
      { domain: "sales", projection: "listing_detail", reason: "Listing — authored-only, нет reconciled runtime state; нет status-полей." },
      { domain: "invest", projection: "portfolios_root", reason: "catalog archetype, не detail." },
    ],
  },
  // Helpers exported для тестов и reuse
  _helpers: { detectSpecFields, detectStatusFields },
};
