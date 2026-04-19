/**
 * undo-toast-window (stable, cross). Merge-промоция из 2 кандидатов:
 *   - undo-toast-irreversible (profi-ru) — toast после reject_bid / delete
 *   - undo-toast-irreversible (linear-triage) — high-throughput triage
 *
 * Общая семантика: destructive intent с irreversibility:"high" ИЛИ
 * "medium", у которого есть inverse-intent (antagonist / pair) —
 * выполняется immediately, но SDK декларирует overlay `undoToast`
 * с N-секундным окном отмены через inverse-intent. Рантайм рендерер
 * запускает timer; клик «Отменить» вызывает inverse.
 *
 * Mutually exclusive с irreversible-confirm: SDK выбирает undo-toast
 * ТОЛЬКО когда:
 *   1. есть intent.antagonist или intent.inverseIntent (автор
 *      декларативно задал pair для rollback);
 *   2. intent.undoable !== false;
 *   3. irreversibility ≤ "high" — для external/physical side effects
 *      (платёж, email, физическая операция) автор ставит
 *      irreversibility:"extreme" или undoable:false, pattern skip.
 *
 * Apply: добавляет `{type:"undoToast", intentId, inverseIntentId,
 * windowSec, message?}` в `slots.overlay`. Рендерер (UndoToast primitive)
 * реагирует на effect:confirmed для intentId — показывает toast +
 * timer + кнопку Отменить.
 */

const DEFAULT_WINDOW_SEC = 7;

function resolveInverse(intent, allIntents) {
  if (typeof intent?.inverseIntent === "string") return intent.inverseIntent;
  if (typeof intent?.antagonist === "string") return intent.antagonist;
  // Эвристика: intent с effects α=remove ищет pair α=add
  const effects = intent?.particles?.effects || [];
  const hasRemove = effects.some(e => e?.α === "remove");
  if (!hasRemove) return null;
  for (const other of allIntents) {
    if (other === intent) continue;
    if (other?.antagonist === intent.id) return other.id;
  }
  return null;
}

function isCandidateForUndoToast(intent, allIntents) {
  if (intent?.undoable === false) return false;
  const irr = intent?.irreversibility;
  if (irr !== "high" && irr !== "medium") return false;
  return resolveInverse(intent, allIntents) != null;
}

export default {
  id: "undo-toast-window",
  version: 1,
  status: "stable",
  archetype: null, // cross
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      if (projection?.undoToast === false) return false;
      return (intents || []).some(i => isCandidateForUndoToast(i, intents));
    },
  },
  structure: {
    slot: "overlay",
    description:
      "Destructive intent с pair (antagonist/inverseIntent) рендерится " +
      "через immediate-apply + N-секундный undo-toast. Альтернатива " +
      "modal-confirm для repeatable operations (triage, delete message, " +
      "reject bid).",
    /**
     * Apply: добавляет undoToast overlay для каждого candidate-intent'а.
     * Idempotent — не дублирует для intent'а, если overlay уже есть.
     */
    apply(slots, context) {
      const { intents, projection } = context || {};
      const overlay = slots?.overlay || [];
      const existing = new Set(
        overlay.filter(o => o?.type === "undoToast").map(o => o.intentId),
      );
      const toAdd = [];
      for (const intent of intents || []) {
        if (!intent?.id) continue;
        if (existing.has(intent.id)) continue;
        if (!isCandidateForUndoToast(intent, intents)) continue;
        toAdd.push({
          type: "undoToast",
          intentId: intent.id,
          inverseIntentId: resolveInverse(intent, intents),
          windowSec: intent.undoWindowSec || projection?.undoWindowSec || DEFAULT_WINDOW_SEC,
          message: intent.undoMessage || null,
        });
      }
      if (!toAdd.length) return slots;
      return { ...slots, overlay: [...overlay, ...toAdd] };
    },
  },
  rationale: {
    hypothesis:
      "Для repeatable destructive operations (triage, reject, delete) " +
      "modal-confirm создаёт friction на каждый кейс. Undo-toast " +
      "конвертирует «подтверждение заранее» в «отмена постфактум», " +
      "сохраняя rollback через pair-intent.",
    evidence: [
      { source: "gmail",   description: "Undo send — canonical 5-30s window",           reliability: "high" },
      { source: "linear",  description: "Triage decline/discard + undo toast",          reliability: "high" },
      { source: "trello",  description: "Archive card → undo toast",                    reliability: "high" },
      { source: "slack",   description: "Delete message — короткий undo",                reliability: "medium" },
      { source: "profi.ru", description: "Reject bid → toast «Отклик отклонён · Отменить»", reliability: "high" },
    ],
    counterexample: [
      { source: "bank-transfer", description: "Financial: nobody undoes, needs explicit modal", reliability: "high" },
      { source: "capture-payment", description: "Physical/external effect — undo невозможен",     reliability: "high" },
    ],
    mergeSources: [
      "candidate/bank/2026-04-19-profi-ru-catalog-undo-toast-irreversible.json",
      "candidate/bank/2026-04-18-linear-triage-view-undo-toast-irreversible.json",
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales",    projection: "bid_detail",
        reason: "reject_bid + pair accept_bid + irreversibility:\"high\"" },
      { domain: "messenger", projection: "message_detail",
        reason: "delete_message с undo window" },
    ],
    shouldNotMatch: [
      { domain: "delivery", projection: "order_tracker",
        reason: "capture_payment — irreversibility:\"extreme\" (external)" },
      { domain: "messenger", projection: "chats_list",
        reason: "send_message — не destructive" },
    ],
  },
};
