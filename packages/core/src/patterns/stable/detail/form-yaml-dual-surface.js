/**
 * form-yaml-dual-surface — toggle Form ↔ YAML editor для bimodal аудитории.
 *
 * Promote из argocd-pattern-batch (2026-04-24, rancher-manager). Закрывает G-A-7.
 * Эталоны: Rancher Workload edit, ArgoCD Application YAML, Flux Kustomization,
 * Kubernetes Dashboard YAML edit.
 *
 * Trigger: form/detail + entity с yaml/manifest поля (type=yaml|json|manifest,
 * fieldRole=manifest|spec|template) ИЛИ entity.resourceClass в k8s/terraform/helm
 * ИЛИ K8s convention (apiVersion + kind + metadata).
 *
 * Apply: form-archetype → slots.form.renderAs = { type: "formYamlDualSurface" }
 *        detail-archetype → slots.body.renderAs = { type: "formYamlDualSurface" }
 * Author-override: no-op если renderAs уже задан.
 */

const YAML_FIELD_TYPES = new Set(["yaml", "json", "manifest", "raw", "template"]);
const YAML_FIELD_ROLES = new Set(["manifest", "raw", "spec", "template"]);
const RESOURCE_CLASSES = new Set(["k8s", "kubernetes", "terraform", "helm", "openapi", "crd"]);
const K8S_CONVENTION   = ["apiVersion", "kind", "metadata"];

function isYamlEditorEntity(entity) {
  const fields = entity?.fields;
  if (!fields || typeof fields !== "object") return false;
  if (entity.resourceClass && RESOURCE_CLASSES.has(entity.resourceClass)) return true;
  const fieldNames = Object.keys(fields);
  if (K8S_CONVENTION.every(f => fieldNames.includes(f))) return true;
  for (const [, def] of Object.entries(fields)) {
    if (!def) continue;
    if (def.type && YAML_FIELD_TYPES.has(def.type)) return true;
    if (def.fieldRole && YAML_FIELD_ROLES.has(def.fieldRole)) return true;
  }
  return false;
}

export default {
  id: "form-yaml-dual-surface",
  version: 1,
  status: "stable",
  archetype: null,
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      const archetype = projection?.archetype;
      if (archetype && archetype !== "form" && archetype !== "detail") return false;
      const entity = ontology?.entities?.[projection?.mainEntity];
      if (!entity) return false;
      return isYamlEditorEntity(entity);
    },
  },
  structure: {
    slot: "body",
    description: "Выставляет renderAs = { type: 'formYamlDualSurface' } на slots.form (form-archetype) или slots.body (detail). Renderer рендерит Form / YAML toggle. Author-override: no-op если renderAs задан. Закрывает G-A-7.",
    apply(slots, context) {
      const { projection, ontology } = context;
      const archetype = projection?.archetype;
      const entity = ontology?.entities?.[projection?.mainEntity];
      if (!entity || !isYamlEditorEntity(entity)) return slots;

      if (archetype === "form") {
        const form = slots?.form;
        if (!form || form.renderAs) return slots;
        return { ...slots, form: { ...form, renderAs: { type: "formYamlDualSurface" } } };
      }

      const body = slots?.body;
      if (!body || body.renderAs || projection?.bodyOverride) return slots;
      return { ...slots, body: { ...body, renderAs: { type: "formYamlDualSurface" } } };
    },
  },
  rationale: {
    hypothesis: "Declarative resources (K8s, Terraform, Helm) имеют bimodal аудиторию: новички — guided form, power-users — прямой manifest edit. Dual-surface с toggle сохраняет оба пути синхронизированными через shared data model.",
    evidence: [
      { source: "Rancher Manager", description: "Workload edit: Form / Edit YAML toggle без потери данных", reliability: "high" },
      { source: "ArgoCD Web UI", description: "Application create: form-wizard + YAML tab", reliability: "high" },
      { source: "Flux Weave GitOps", description: "Kustomization edit: форма + YAML toggle", reliability: "high" },
      { source: "Kubernetes Dashboard", description: "Edit resource — YAML editor с Form fallback", reliability: "medium" },
    ],
    counterexample: [
      { source: "messenger / send_message", description: "Message не declarative resource — обычная форма", reliability: "high" },
      { source: "booking / create_appointment", description: "Appointment — domain form без manifest semantics", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "argocd", projection: "application_form", reason: "Application — K8s CRD с apiVersion + kind + metadata" },
    ],
    shouldNotMatch: [
      { domain: "booking", projection: "create_booking", reason: "Booking без manifest semantics" },
      { domain: "messenger", projection: "send_message_form", reason: "Message без yaml/manifest fields" },
      { domain: "invest", projection: "portfolios_root", reason: "Catalog, не form/detail" },
    ],
  },
  _helpers: { isYamlEditorEntity },
};
