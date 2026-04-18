/**
 * optimistic-replace-with-undo — дуал к irreversible-confirm.
 *
 * Для обратимых частых ops (replace статуса, assignment, priority) modal
 * confirmation создаёт friction. Вместо этого — optimistic update +
 * undo-toast (3-5 сек окно revert).
 *
 * Конвергентный signal: Linear (property changes), Superhuman (archive/snooze).
 */
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
