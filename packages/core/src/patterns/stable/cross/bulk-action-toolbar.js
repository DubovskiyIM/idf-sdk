/**
 * bulk-action-toolbar — selection-triggered action bar для batch-операций.
 *
 * Если в домене объявлены bulk_*-intents (bulk_assign, bulk_move_to_phase,
 * bulk_archive), это сигнал что пользователь обрабатывает items group-wise.
 * Selection должен быть first-class, actions доступны как toolbar-bar.
 *
 * Конвергентный signal: Height (bulk task-ops), Linear Triage (bulk T/P/D).
 */
export default {
  id: "bulk-action-toolbar",
  version: 1,
  status: "stable",
  archetype: null, // применим к catalog и feed
  trigger: {
    requires: [],
    match(intents) {
      const bulkIntents = intents.filter(i => i.id?.startsWith("bulk_"));
      return bulkIntents.length >= 2;
    },
  },
  structure: {
    slot: "toolbar",
    description:
      "Toolbar-бар появляется при selection.length ≥1. Показывает доступные bulk_*-intents как кнопки " +
      "+ счётчик выделенного + «отменить выбор». Скрывается при selection=0.",
  },
  rationale: {
    hypothesis:
      "bulk_*-intents — явное заявление, что домен ожидает group-операций. Без dedicated UI пользователь " +
      "вынужден либо N раз выполнять один и тот же intent (expensive loop), либо открывать per-item detail. " +
      "Toolbar активируется selection-triggered — не конкурирует с per-card actions.",
    evidence: [
      { source: "height", description: "Checkbox-selection → 'Move to Phase / Assign to User' action bar", reliability: "high" },
      { source: "linear", description: "Shift+click range selection + bulk-hotkeys для triage", reliability: "high" },
      { source: "gmail", description: "Selection → bulk-archive/label/delete — canonical mail UX", reliability: "high" },
    ],
    counterexample: [
      {
        source: "single-item-domains",
        description: "Domain без bulk_*-intents — отдельный toolbar overkill, lift в command palette",
        reliability: "high",
      },
    ],
  },
  falsification: {
    // В текущих IDF доменах bulk_*-intents декларированы только в messenger
    // (mark_conversations_as_read, archive_selected). Это реальные match-cases.
    // Для sales/delivery — aspirational (нужны bulk_* intents для hit).
    shouldMatch: [
      { domain: "messenger", projection: "conversation_list", reason: "messenger имеет bulk_mark_read / bulk_archive — реальные bulk-intents" },
    ],
    shouldNotMatch: [
      { domain: "booking", projection: "service_catalog", reason: "booking не имеет bulk_*-intents — single-booking flow" },
      { domain: "lifequest", projection: "habit_list", reason: "habits индивидуальны, bulk-op неприменим" },
    ],
  },
};
