/**
 * catalog-creator-toolbar (§6.1).
 *
 * Multi-param creator'ы (`particles.parameters.length > 1` или
 * `confirmation === "form"`) не подходят для heroCreate — он рассчитан
 * на single-text creator'ы (todo-list style). Такие intents должны
 * уходить в toolbar с formModal-overlay.
 *
 * Раньше автор был вынужден писать `confirmation:"enter"` для heroCreate
 * или руками переносить creator в toolbar через `control:"formModal"`.
 * Этот pattern декларативно описывает: «если creator multi-param —
 * его место в toolbar, не в hero».
 */

function normalizeCreates(value) {
  if (typeof value !== "string") return null;
  return value.replace(/\(.*\)$/, "").trim();
}

function getConfirmation(intent) {
  return intent?.confirmation ?? intent?.particles?.confirmation;
}

function isMultiParamCreator(intent, mainEntity) {
  const creates = normalizeCreates(intent?.creates);
  if (!creates || creates !== mainEntity) return false;
  const c = getConfirmation(intent);
  if (c === "form") return true;
  const partsLen = (intent?.particles?.parameters?.length) || 0;
  const topLen = Array.isArray(intent?.parameters) ? intent.parameters.length : 0;
  return Math.max(partsLen, topLen) > 1;
}

export default {
  id: "catalog-creator-toolbar",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "intent-creates", entity: "$mainEntity" },
    ],
    match(intents, ontology, projection) {
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;
      return (intents || []).some(i => isMultiParamCreator(i, mainEntity));
    },
  },
  structure: {
    slot: "toolbar",
    description:
      "Multi-param creator кладётся в toolbar с formModal-overlay " +
      "(не heroCreate). Автор может оставить heroCreate для single-text " +
      "creator'а — ranking паттернов и специфика triggers сами выберут.",
    /**
     * Apply: если в slots.toolbar уже есть button с этим intentId — no-op.
     * Иначе добавляет { type:"intentButton", opens:"overlay", overlayKey }
     * в toolbar. Overlay (formModal) уже лежит в slots.overlay (его
     * создаёт wrapByConfirmation). Если overlay нет — pattern не создаёт
     * placeholder, чтобы не задваивать существующий formModal flow.
     */
    apply(slots, context) {
      const { projection, intents } = context || {};
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return slots;

      const existingToolbarIds = new Set(
        (slots?.toolbar || []).map(t => t?.intentId).filter(Boolean)
      );
      const existingOverlayIds = new Set(
        (slots?.overlay || []).map(o => o?.intentId).filter(Boolean)
      );
      const toAdd = [];
      for (const intent of intents || []) {
        const id = intent?.id;
        if (!id) continue;
        if (!isMultiParamCreator(intent, mainEntity)) continue;
        if (existingToolbarIds.has(id)) continue;
        if (!existingOverlayIds.has(id)) continue; // overlay должен быть сгенерирован до
        toAdd.push({
          type: "intentButton",
          intentId: id,
          label: intent.name || id,
          opens: "overlay",
          overlayKey: id,
        });
      }
      if (toAdd.length === 0) return slots;
      return {
        ...slots,
        toolbar: [...(slots?.toolbar || []), ...toAdd],
      };
    },
  },
  rationale: {
    hypothesis:
      "Single-text creator идеален для inline hero; multi-param creator " +
      "требует отдельного модального окна для сбора полей.",
    evidence: [
      { source: "linear",       description: "Issue create — hero text + optional form modal",         reliability: "high" },
      { source: "github",       description: "New repo — multi-param в modal, не inline",              reliability: "high" },
      { source: "profi.ru",     description: "Создание заказа — wizard с preview, не hero-input",      reliability: "high" },
    ],
    counterexample: [
      { source: "todoist", description: "Task-add hero — single text, правильно heroCreate", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "freelance", projection: "tasks_board",
        reason: "create_task_draft: title + description + price → multi-param, не hero" },
      { domain: "sales", projection: "listings_feed",
        reason: "create_listing: 5 полей через confirmation:\"form\"" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "chats_list",
        reason: "send_message: confirmation:\"enter\" + single text → heroCreate" },
    ],
  },
};
