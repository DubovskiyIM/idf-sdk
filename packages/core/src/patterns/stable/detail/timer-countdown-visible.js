/**
 * timer-countdown-visible (§6.5).
 *
 * Detail-entity с активным ScheduledTimer (§4 scheduler) должна
 * визуально показывать обратный отсчёт до auto-transition. Example:
 * booking/auto_cancel_pending_booking (24h), delivery/auto_accept_after_3d.
 * Без visible countdown пользователь не знает о urgency.
 *
 * Детект на crystallize-time (не runtime): у mainEntity есть intent,
 * emit'ящий `schedule_timer` эффект. Сам timer в world — отдельная
 * коллекция (`scheduledTimers`), рендерер обращается к ней в runtime.
 *
 * Apply: инжектит `{type:"countdown", bind:"__scheduledTimer",
 * fireIntentLabel}` в header row. Renderer (Countdown primitive)
 * находит первый active timer для target.id в ctx.world.scheduledTimers,
 * рендерит HH:MM:SS или null, если timer'а нет.
 */

function getTimerEmittingIntents(intents, mainEntity) {
  const out = [];
  const lower = (mainEntity || "").toLowerCase();
  for (const intent of intents || []) {
    const effects = intent?.particles?.effects || [];
    for (const ef of effects) {
      // Явный маркер: effect с intentId "schedule_timer" или target.includes "scheduledTimer"
      const isSchedule =
        (ef.α === "add" && typeof ef.target === "string" && /scheduledTimer|timer/i.test(ef.target)) ||
        ef.emit === "schedule_timer" ||
        ef.intent === "schedule_timer";
      if (!isSchedule) continue;
      // Контекстуально: timer касается mainEntity (через parent/target.id)
      // Heuristic: intent меняет тоже mainEntity.status (типичный кейс
      // «перевели в state X, запланировали auto-transition из X»).
      const touchesMain = effects.some(e2 =>
        typeof e2?.target === "string" &&
        (e2.target === lower || e2.target.startsWith(lower + "."))
      );
      if (touchesMain) {
        out.push(intent);
        break;
      }
    }
  }
  return out;
}

export default {
  id: "timer-countdown-visible",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      if (projection?.kind !== "detail") return false;
      return getTimerEmittingIntents(intents, projection?.mainEntity).length > 0;
    },
  },
  structure: {
    slot: "header",
    description:
      "detail.header получает {type:\"countdown\", bind:\"__scheduledTimer\"} " +
      "primitive, который рендерер читает из ctx.world.scheduledTimers " +
      "для target.id.",
    /**
     * Apply: добавляет countdown-node в начало slots.header.
     * Author-override: если slots.header уже содержит countdown,
     * pattern no-op.
     */
    apply(slots, context) {
      const { projection, intents } = context || {};
      const header = slots?.header || [];
      if (header.some(n => n?.type === "countdown")) return slots;
      const timerIntents = getTimerEmittingIntents(intents, projection?.mainEntity);
      if (!timerIntents.length) return slots;
      return {
        ...slots,
        header: [
          { type: "countdown", bind: "__scheduledTimer" },
          ...header,
        ],
      };
    },
  },
  rationale: {
    hypothesis:
      "Auto-transition через N часов без visible countdown создаёт " +
      "surprise-failure: пользователь не успевает отреагировать. " +
      "Countdown делает invariant \"time ticks\" видимым.",
    evidence: [
      { source: "ebay",       description: "Аукцион: visible countdown до закрытия",                reliability: "high" },
      { source: "stripe",     description: "Payment intent countdown до auto-capture",              reliability: "high" },
      { source: "upwork",     description: "Escrow auto-release с visible countdown у бариста",     reliability: "high" },
      { source: "booking.com", description: "Pay-later: \"pay within 24h\" countdown",              reliability: "medium" },
    ],
    counterexample: [
      { source: "email-drafts", description: "Auto-save через 5 мин — countdown бесполезен (UX-шум)", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "booking",  projection: "booking_detail",
        reason: "auto_cancel_pending_booking через 24h" },
      { domain: "delivery", projection: "order_tracker",
        reason: "auto_accept_after_3d через schedule_timer" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "message_detail",
        reason: "нет scheduled_timer intents" },
      { domain: "lifequest", projection: "goal_detail",
        reason: "нет auto-transitions" },
    ],
  },
};
