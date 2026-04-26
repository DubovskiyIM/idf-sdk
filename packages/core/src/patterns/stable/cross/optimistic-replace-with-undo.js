/**
 * optimistic-replace-with-undo — дуал к irreversible-confirm.
 *
 * Для обратимых частых ops (replace статуса, assignment, priority) modal
 * confirmation создаёт friction. Вместо этого — optimistic update +
 * undo-toast (3-5 сек окно revert).
 *
 * Конвергентный signal: Linear (property changes), Superhuman (archive/snooze).
 *
 * Apply: для каждого qualifying replace-click intent'а emit
 * `{type:"undoToast", intentId, inverseIntentId, windowSec, message?}` в
 * `slots.overlay`. Shape совместим с паттерном `undo-toast-window` —
 * primitive `UndoToast` (renderer) рендерит обе формы через один pipeline;
 * overlap между двумя паттернами защищён идемпотентностью по intentId.
 */

const DEFAULT_WINDOW_SEC = 5; // Linear / Superhuman: 3-5 сек; берём среднее.

function resolveInverse(intent) {
  if (typeof intent?.inverseIntent === "string") return intent.inverseIntent;
  if (typeof intent?.antagonist === "string") return intent.antagonist;
  // Для α=replace нет remove↔add-эвристики: без явного inverse
  // post-hoc revert невозможен — pattern пропускает такой intent.
  return null;
}

function isOptimisticCandidate(intent) {
  if (!intent) return false;
  if (intent.undoable === false) return false;
  // irreversibility:high/extreme — территория irreversible-confirm /
  // undo-toast-window. Optimistic работает только для reversible replace.
  const irr = intent.irreversibility;
  if (irr === "high" || irr === "extreme") return false;
  const effects = intent.particles?.effects || [];
  const hasReplace = effects.some(e => e?.α === "replace");
  const isClick = intent.particles?.confirmation === "click";
  return hasReplace && isClick;
}

export default {
  id: "optimistic-replace-with-undo",
  version: 1,
  status: "stable",
  archetype: null,
  trigger: {
    requires: [
      { kind: "intent-count", α: "replace", min: 3 },
    ],
    match(intents) {
      // Применим только если есть click-confirmation intents (high-frequency),
      // и НЕТ явной irreversibility=high (та покрывается irreversible-confirm).
      const replaceClick = intents.filter(i =>
        (i.particles?.effects || []).some(e => e.α === "replace") &&
        i.particles?.confirmation === "click"
      );
      return replaceClick.length >= 3;
    },
  },
  structure: {
    slot: "overlay",
    description: "Toast-уведомление bottom-right после каждого replace с кнопкой «Отменить» (Cmd+Z / U). 3-5 сек expiry.",
    /**
     * Apply: добавляет undoToast overlay для каждого candidate-replace-click
     * intent'а с resolvable inverse. Idempotent — не дублирует для intent'а,
     * если overlay уже содержит undoToast с тем же intentId.
     */
    apply(slots, context) {
      const { intents, projection } = context || {};
      if (projection?.undoToast === false) return slots;

      const candidates = (intents || []).filter(isOptimisticCandidate);
      // Trigger threshold должен совпадать с match — защита от false-positive
      // при ручном applyEnabled в обход matcher'а.
      if (candidates.length < 3) return slots;

      const overlay = slots?.overlay || [];
      const existing = new Set(
        overlay.filter(o => o?.type === "undoToast").map(o => o.intentId),
      );

      const toAdd = [];
      for (const intent of candidates) {
        if (!intent?.id) continue;
        if (existing.has(intent.id)) continue;
        const inverse = resolveInverse(intent);
        if (!inverse) continue;
        toAdd.push({
          // Stable key, deterministic per (intent → inverse).
          // validateArtifact (idf backlog §13.11) требует уникальный key
          // на каждый overlay entry, иначе artifact rejected.
          key: `undoToast__${intent.id}`,
          type: "undoToast",
          intentId: intent.id,
          inverseIntentId: inverse,
          windowSec:
            intent.undoWindowSec ||
            projection?.undoWindowSec ||
            DEFAULT_WINDOW_SEC,
          message: intent.undoMessage || null,
        });
      }
      if (!toAdd.length) return slots;
      return { ...slots, overlay: [...overlay, ...toAdd] };
    },
  },
  rationale: {
    hypothesis:
      "Confirmation на каждую frequent reversible mutation порождает modal-fatigue и тормозит power-user. " +
      "Для обратимых ops latency ценнее accuracy: undo-toast скрывает подтверждение, возвращая control через explicit revert. " +
      "Дуал паттерна irreversible-confirm, покрывающий оставшуюся половину контракта.",
    evidence: [
      { source: "linear", description: "Все property changes оптимистичны, undo toast без дублирования confirmation", reliability: "high" },
      { source: "superhuman", description: "Archive/snooze/mark-read → 3s undo toast, Cmd+Z revert", reliability: "high" },
      { source: "gmail", description: "Archive with undo — канонический пример latency-над-accuracy для email", reliability: "high" },
    ],
    counterexample: [
      {
        source: "financial-trades",
        description: "Bulk trade-execution: optimistic+undo опасен, потому что external side-effects (SEC reporting) ≠ revertable",
        reliability: "high",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "lifequest", projection: "habit_list", reason: "≥3 replace intents (complete_habit, skip_habit, ...) + click-confirmation" },
      { domain: "lifequest", projection: "dashboard", reason: "множество replace на attributes с click-confirmation" },
      { domain: "planning", projection: "poll_overview", reason: "vote_yes/no/maybe — frequent reversible replace" },
    ],
    shouldNotMatch: [
      { domain: "delivery", projection: "order_detail", reason: "capture_payment — irreversibility=high, требует confirm, не undo" },
    ],
  },
};
