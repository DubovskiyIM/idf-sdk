/**
 * form-yaml-dual-surface — Form↔YAML toggle для declarative resources.
 *
 * Declarative ресурсы (K8s CRD, Terraform, ArgoCD Application.spec)
 * имеют bimodal аудиторию: новички хотят guided form (field-by-field),
 * power-users хотят прямой доступ к manifest'у (YAML/JSON editor).
 * Toggle внутри одного intent'а (не двух отдельных) сохраняет
 * семантическое единство — нет дубликации form+yaml overlays.
 *
 * Promote'ится из argocd-pattern-batch (2026-04-24): backlog §10 G-A-7
 * (yamlEditor archetype). Эталоны: ArgoCD Application.spec (5-tab form ↔
 * raw YAML), Rancher Manager cluster/workload форма, Lens IDE manifest view.
 *
 * Trigger: detail + mainEntity имеет yaml/manifest-field (fieldRole ===
 * "raw-manifest" ИЛИ type === "yaml"/"json" ИЛИ имя совпадает с именами
 * из YAML_FIELD_NAMES) И хотя бы одно structured-field (не yaml/json/richText).
 *
 * Apply: находит form/edit overlay в slots.overlays нацеленный на mainEntity
 * без renderHint, добавляет `renderHint: "yamlToggle"` + `yamlField: <name>`.
 * Idempotent: если renderHint уже задан — no-op.
 *
 * Author-override: автор может выставить `overlay.renderHint` сам —
 * тогда apply не вмешивается. Также уважает `projection.noYamlToggle: true`
 * как kill-switch.
 *
 * Закрывает backlog §10 G-A-7.
 */

/** Имена полей, которые сигнализируют о YAML/manifest-хранилище. */
const YAML_FIELD_NAMES = new Set([
  "yaml", "spec", "manifest", "config", "definition", "template",
  "body", "content", "rawSpec", "rawManifest", "yamlSpec",
]);

/** Типы полей, считающихся raw-manifest/structured-document. */
const YAML_TYPES = new Set(["yaml", "json"]);

/** Типы полей, которые не считаются «structured» (не формируют form). */
const UNSTRUCTURED_TYPES = new Set(["yaml", "json", "richText", "image", "multiImage"]);

/**
 * Проверяет, является ли поле yaml/manifest-field.
 * Три критерия (OR): fieldRole === "raw-manifest", type === "yaml"|"json",
 * имя поля входит в YAML_FIELD_NAMES.
 */
export function isYamlField(fieldName, fieldDef) {
  if (!fieldDef) return false;
  if (fieldDef.fieldRole === "raw-manifest") return true;
  if (YAML_TYPES.has((fieldDef.type || "").toLowerCase())) return true;
  if (YAML_FIELD_NAMES.has(fieldName)) return true;
  return false;
}

/**
 * Ищет первое yaml/manifest-поле в entity. Возвращает имя поля или null.
 */
export function detectYamlField(entity) {
  const fields = entity?.fields;
  if (!fields || typeof fields !== "object") return null;
  for (const [name, def] of Object.entries(fields)) {
    if (isYamlField(name, def)) return name;
  }
  return null;
}

/**
 * Проверяет наличие хотя бы одного structured-field (не yaml/json/richText/image).
 * Без structured-fields форма бессодержательна — toggle не нужен.
 */
export function hasStructuredFields(entity) {
  const fields = entity?.fields;
  if (!fields || typeof fields !== "object") return false;
  for (const [name, def] of Object.entries(fields)) {
    // Пропускаем yaml-field сам по себе
    if (isYamlField(name, def)) continue;
    const type = (def?.type || "").toLowerCase();
    if (UNSTRUCTURED_TYPES.has(type)) continue;
    // Нашли structured-field
    return true;
  }
  return false;
}

export default {
  id: "form-yaml-dual-surface",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    /**
     * Matches: detail + mainEntity имеет yaml/manifest-field + ≥1 structured-field.
     * Archetype-guard: projection.archetype отсутствует (undefined) ИЛИ === "detail".
     */
    match(intents, ontology, projection) {
      const arch = projection?.archetype;
      if (arch && arch !== "detail") return false;
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity?.fields || typeof entity.fields !== "object") return false;
      if (projection?.noYamlToggle === true) return false;
      if (!detectYamlField(entity)) return false;
      if (!hasStructuredFields(entity)) return false;
      return true;
    },
  },
  structure: {
    slot: "overlays",
    description: "Для form/edit overlay'ев в slots.overlays, нацеленных на mainEntity без renderHint, добавляет renderHint: 'yamlToggle' + yamlField: '<detected name>'. Renderer dispatcher (ProjectionRendererV2) переключает форму в dual-surface (guided form / raw YAML). Idempotent: если renderHint уже задан — no-op. Author-override через overlay.renderHint или projection.noYamlToggle: true. Закрывает §10 G-A-7.",
    /**
     * Apply: итерируемся по slots.overlays, ищем form/edit overlays для mainEntity
     * без renderHint. Добавляем renderHint и yamlField. Pure function.
     */
    apply(slots, context) {
      const { projection, ontology } = context || {};
      if (projection?.noYamlToggle === true) return slots;

      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return slots;

      const entity = ontology?.entities?.[mainEntity];
      const yamlFieldName = detectYamlField(entity);
      if (!yamlFieldName) return slots;
      if (!hasStructuredFields(entity)) return slots;

      const overlays = slots?.overlays;
      if (!Array.isArray(overlays) || overlays.length === 0) return slots;

      let mutated = false;
      const newOverlays = overlays.map(overlay => {
        // Пропускаем: уже есть renderHint (author-override или другой pattern)
        if (overlay?.renderHint) return overlay;
        // Только form/edit overlays для mainEntity
        const kind = overlay?.kind;
        if (kind && kind !== "form" && kind !== "edit" && kind !== "formModal") return overlay;
        const targetEntity = overlay?.entity;
        if (targetEntity && targetEntity !== mainEntity) return overlay;

        mutated = true;
        return { ...overlay, renderHint: "yamlToggle", yamlField: yamlFieldName };
      });

      if (!mutated) return slots;
      return { ...slots, overlays: newOverlays };
    },
  },
  rationale: {
    hypothesis: "Declarative resources (K8s, Terraform, CRDs) имеют bimodal аудиторию: новички хотят guided form, power-users хотят прямой доступ к manifest'у. Toggle внутри одного intent'а (не двух разных) сохраняет семантическое единство — world-mutation остаётся одним effect'ом, независимо от способа ввода. Два overlay'а (form + yamlEditor) дублировали бы intent с разными поверхностями, что нарушает DRY-принцип на уровне намерений.",
    evidence: [
      { source: "ArgoCD Web UI", description: "Application.spec: guided 5-tab form (Source/Destination/Sync/Parameters/Advanced) ↔ Edit as YAML кнопка в правом верхнем углу. Toggle сохраняет unsaved state.", reliability: "high" },
      { source: "Rancher Manager", description: "Cluster provisioning + workload create: Form / Edit YAML два режима с shared state (изменение в одном отражается в другом)", reliability: "high" },
      { source: "Lens IDE", description: "Resource detail: Edit (form) ↔ Edit YAML toggle для любого K8s объекта — Deployment/Service/ConfigMap", reliability: "high" },
      { source: "OpenShift Console", description: "YAML editor + Form view переключаются через radio-group, изменения синхронизируются", reliability: "high" },
      { source: "Terraform Cloud", description: "Variable definition: structured fields ↔ HCL/JSON editor toggle", reliability: "medium" },
    ],
    counterexample: [
      { source: "Stripe Webhooks", description: "Endpoint config — нет manifest: чисто structured form (url/events). YAML toggle adds no value без raw-manifest field", reliability: "high" },
      { source: "booking / TimeSlot", description: "TimeSlot (date+duration+price) — только structured fields, нет yaml-manifest. Form-only поверхность корректна", reliability: "high" },
      { source: "sales / Listing", description: "Listing fields — text/multiImage/money. YAML toggle не применим без yaml/spec/manifest field", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "argocd", projection: "application_detail", reason: "Application.spec — yaml-type field + structured fields (destination/source/project) → yamlToggle нужен" },
      { domain: "keycloak", projection: "client_detail", reason: "Client имеет json-export field (или config/definition) + structured fields (clientId/protocol/enabled) → toggle корректен" },
    ],
    shouldNotMatch: [
      { domain: "booking", projection: "booking_detail", reason: "Booking: date+status+specialist — нет yaml/spec/manifest field, только structured" },
      { domain: "sales", projection: "listing_detail", reason: "Listing: title+images+price — нет raw-manifest field" },
    ],
  },
  // Helpers exported для тестов и reuse
  _helpers: { isYamlField, detectYamlField, hasStructuredFields },
};
