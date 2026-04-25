/**
 * diff-preview-before-irreversible — side-by-side diff внутри ConfirmDialog
 * для structured-mutation с высокой irreversibility.
 *
 * Promote из argocd-pattern-batch (2026-04-24, argocd-web-ui candidate).
 * Эталоны: ArgoCD Rollback (live vs desired YAML diff), Spinnaker side-by-side
 * version diff, Flux resource diff, Rancher cluster destructive op preview.
 *
 * `irreversible-confirm` показывает «вы уверены?», но не ЧТО именно изменится.
 * Когда изменение — мутация structured document (YAML, config, schema, state),
 * пользователь принимает решение вслепую. Diff-preview устраняет information
 * asymmetry до commit'а — reduces accidental irreversibility.
 *
 * Trigger: cross-archetype + intent с irreversibility=high + entity с полями
 * типа object/yaml/json/manifest (т.е. structured content, не scalar).
 *
 * Apply: расширяет существующий `irreversible-confirm` флаг → добавляет
 * intent.confirmDialog.diffPreview = { beforeField, afterField } если ещё не задан.
 * Renderer ConfirmDialog уже поддерживает diffPreview (renderer@0.18+).
 */

const STRUCTURED_TYPES  = new Set(["object", "yaml", "json", "manifest", "array"]);
const STRUCTURED_ROLES  = new Set(["manifest", "spec", "template", "config"]);

function hasStructuredField(entity) {
  const fields = entity?.fields;
  if (!fields || typeof fields !== "object") return false;
  for (const [, def] of Object.entries(fields)) {
    if (!def) continue;
    if (def.type && STRUCTURED_TYPES.has(def.type)) return true;
    if (def.fieldRole && STRUCTURED_ROLES.has(def.fieldRole)) return true;
  }
  return false;
}

export default {
  id: "diff-preview-before-irreversible",
  version: 1,
  status: "stable",
  archetype: null, // cross — любой archetype
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      // Нужен хотя бы один intent с irreversibility=high
      const hasIrr = intents.some(i =>
        i.irreversibility === "high" ||
        i.particles?.effects?.some?.(e => e.context?.__irr?.point === "high") ||
        i.context?.__irr?.point === "high"
      );
      if (!hasIrr) return false;
      // Entity должна содержать structured-type поля
      const entity = ontology?.entities?.[projection?.mainEntity];
      if (!entity) return false;
      return hasStructuredField(entity);
    },
  },
  structure: {
    slot: "confirmDialog",
    description: "Расширяет ConfirmDialog для intents с irreversibility=high + structured entity: добавляет intent.confirmDialog.diffPreview = { enabled: true }. Renderer показывает side-by-side diff (before/after) перед confirm. Author-override: no-op если confirmDialog.diffPreview уже задан.",
    apply(slots, context) {
      const { intents, ontology, projection } = context;
      if (!intents || !Array.isArray(intents)) return slots;
      const entity = ontology?.entities?.[projection?.mainEntity];
      if (!entity || !hasStructuredField(entity)) return slots;

      const irreversibleIntents = intents.filter(i =>
        i.irreversibility === "high" ||
        i.particles?.effects?.some?.(e => e.context?.__irr?.point === "high")
      );
      if (irreversibleIntents.length === 0) return slots;

      // Выставляем confirmDialog.diffPreview для каждого irreversible intent
      // в slots если есть overlay/confirmDialog slot
      const overlays = slots?.overlays;
      if (!overlays || typeof overlays !== "object") return slots;

      let mutated = false;
      const newOverlays = {};
      for (const [key, overlay] of Object.entries(overlays)) {
        if (overlay?.type === "confirmDialog" && !overlay?.diffPreview) {
          const matchingIntent = irreversibleIntents.find(i => i.id === overlay.intentId || overlay.intentId?.startsWith(i.id));
          if (matchingIntent) {
            newOverlays[key] = { ...overlay, diffPreview: { enabled: true } };
            mutated = true;
            continue;
          }
        }
        newOverlays[key] = overlay;
      }

      if (!mutated) return slots;
      return { ...slots, overlays: newOverlays };
    },
  },
  rationale: {
    hypothesis: "ConfirmDialog для irreversible operations показывает 'вы уверены?' без ЧТО изменится. Для structured mutations (YAML, config, schema) это information asymmetry — пользователь подтверждает вслепую. Diff-preview снижает accidental irreversibility и MTTR при ошибках.",
    evidence: [
      { source: "ArgoCD Web UI", description: "Rollback dialog показывает side-by-side YAML diff перед confirm (live vs target revision)", reliability: "high" },
      { source: "Spinnaker Deck", description: "Server-group side-by-side version diff перед destructive rollback action", reliability: "high" },
      { source: "Flux Weave GitOps", description: "Force reconcile — preview manifest diff (current vs desired Git revision)", reliability: "medium" },
      { source: "Terraform Cloud", description: "Plan preview (добавлено / удалено / изменено ресурсов) обязателен перед apply", reliability: "high" },
    ],
    counterexample: [
      { source: "delete_message / messenger", description: "Message.content — plain text scalar; diff избыточен для delete", reliability: "high" },
      { source: "cancel_booking", description: "Booking cancellation: scalar status change; diff не нужен", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "argocd", projection: "application_detail", reason: "Application: rollback_to_revision = irreversibility:high + spec object field → diff preview" },
      { domain: "compliance", projection: "control_detail", reason: "AmendAttestation = __irr:high + structured evidence fields" },
    ],
    shouldNotMatch: [
      { domain: "booking", projection: "booking_detail", reason: "cancel_booking: scalar status, нет structured fields" },
      { domain: "messenger", projection: "conversation_detail", reason: "delete_message: scalar text content" },
    ],
  },
  _helpers: { hasStructuredField },
};
