/**
 * Human-in-the-loop gate — приостановка execution до подтверждения от человека.
 *
 * Source: workflow-editor field-research 2026-04-25 (HITLForm production usage),
 * field-research support-/dispatch-domains (manual review queues).
 *
 * Концепция: intent помечен `particles.confirmation = "human-input"` (или
 * "manual-review") — означая что между proposed и confirmed effect-фазой
 * требуется блокирующий шаг с участием человека-supervisor'а. UI приостанавливает
 * lifecycle, рендерит prompt-форму («заполните ответ», «утвердите шаг»,
 * «выберите ветку»), эффекты не применяются пока supervisor не submit'нул.
 *
 * В отличие от irreversible-confirm (один-кликовое подтверждение того, кто
 * запустил intent), HITL-gate — асинхронная пауза с возможной сменой actor'а
 * (запустил один, дозаполнил другой), часто с timeout/escalation policy.
 *
 * Matching-only candidate (без structure.apply). Promotion в stable + apply
 * требует:
 *   - `intent.particles.confirmation = "human-input"` как первоклассное
 *     значение в schema (сейчас — open-set string);
 *   - renderer primitive `<HumanInputGate>` с прогресс-индикатором ожидания;
 *   - timeout/escalation API на host-стороне (timer + auto-cancel или
 *     auto-promote-to-supervisor).
 */
export default {
  id: "human-in-the-loop-gate",
  version: 1,
  status: "candidate",
  archetype: null, // cross — применяется на любом archetype с такими intent'ами
  trigger: {
    requires: [
      { kind: "intent-confirmation", confirmation: "human-input" },
    ],
  },
  structure: {
    slot: "body",
    description: "Между proposed-effect и confirmed-effect фазами вставляется блокирующий слой 'awaiting human input'. UI рендерит inline-форму или modal с prompt'ом для supervisor'а: текст-вопрос, choice-list или structured fields. Effect не применяется пока submit не пришёл. Status-индикатор (yellow badge 'awaiting review') виден всем участникам, способным наблюдать intent. При истечении timeout — fallback policy (auto-cancel или escalate).",
  },
  rationale: {
    hypothesis: "Часть intent'ов в production-flow невозможно полностью автоматизировать: требуется вмешательство человека для уточнения, морального суждения, правовой проверки или просто supervised approval. Inline-confirm здесь не работает: (а) запрашивающий и подтверждающий — разные лица; (б) интервал может быть часами; (в) ответ может быть structured (не только yes/no). HITL-gate формализует эту паузу как first-class lifecycle-state, отличный от irreversible-confirm.",
    evidence: [
      { source: "n8n / Make / Zapier", description: "Wait-for-Webhook + Manual Approval nodes — workflow приостанавливается до получения reply от человека через email/telegram/slack", reliability: "high" },
      { source: "Temporal.io / Camunda", description: "User Task / Wait-for-Signal как first-class workflow primitive — между service-task'ами активный человек-actor", reliability: "high" },
      { source: "GitHub Actions environment approvals", description: "Production deploy job блокируется до review (assigned reviewer должен approve)", reliability: "high" },
      { source: "AWS Step Functions Activity tasks", description: "Долго-живущий external worker (часто человек) забирает task через `GetActivityTask`, отдаёт результат через `SendTaskSuccess`", reliability: "high" },
      { source: "Stripe Radar / fraud review queues", description: "Border-line transactions ставятся в manual review queue до ручного 'release' / 'block'", reliability: "high" },
      { source: "ZenDesk / Salesforce approval flows", description: "Ticket приостанавливается до approval-step; SLA-таймер начинает отсчёт", reliability: "medium" },
      { source: "AI agent moderation gates", description: "Pre-execute review: AI-агент предлагает действие, человек approve/reject/edit перед execute", reliability: "high" },
    ],
    counterexample: [
      { source: "irreversible-confirm dialog", description: "Single-actor synchronous confirmation в той же сессии — это irreversible-confirm паттерн, не HITL", reliability: "high" },
      { source: "form-submit with validation", description: "Ввод данных самим actor'ом в один шаг — обычная form-archetype, без gate", reliability: "high" },
      { source: "auto-approved low-risk intents", description: "Intent с `irreversibility: 'low'` не нуждается в human-gate", reliability: "high" },
      { source: "real-time chat reply", description: "Conversational ответ — это data-flow, не lifecycle-pause", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "compliance", projection: "approval_queue", reason: "approve_je intent с confirmation='human-input' — preparer запускает, approver подтверждает позже" },
      { domain: "delivery", projection: "dispatcher_assignment", reason: "Manual reroute требует supervisor decision (assign-courier intent с confirmation='human-input')" },
      { domain: "freelance", projection: "deal_review", reason: "Revision-loop: customer запускает request_revision, executor подтверждает приём через HITL" },
      { domain: "workflow", projection: "execution_runner", reason: "Workflow-step с pause-node — supervisor вводит ответ, execution продолжается" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "send_message", reason: "Single-actor send — нет паузы для review" },
      { domain: "sales", projection: "place_bid", reason: "Самостоятельное действие пользователя без external review" },
      { domain: "lifequest", projection: "complete_habit", reason: "Personal log — нет supervisor'а" },
      { domain: "invest", projection: "portfolio_view", reason: "Read-only projection без intents" },
    ],
  },
};
