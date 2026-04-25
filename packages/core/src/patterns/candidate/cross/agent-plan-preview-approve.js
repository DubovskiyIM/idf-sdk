/**
 * Agent plan preview / approve / reject — визуализация multi-effect plan'а
 * перед его commit'ом, с возможностью подтвердить целиком или отвергнуть.
 *
 * Source: AI-agent vertical-stack field research 2026-04-25 (assistant с tools-API
 * генерирует mass-mutation, человек-supervisor решает применять или нет).
 *
 * Концепция: агент-роль (`role.base: "agent"`) предлагает intent-batch с
 * confirmation='preapproval'. Между proposing и confirming UI рендерит
 * структурированный plan-preview: список изменений с группировкой по
 * сущностям, diff'ом полей, side-effects (cascade-deletes, ripple-updates),
 * предполагаемой стоимостью. Supervisor одним действием approve/reject —
 * либо partial-approve (выкинуть отдельные effects из batch'а перед apply).
 *
 * Distinct от irreversible-confirm: plan-preview многоэлементный, рендерится
 * как структурированный отчёт, может содержать nested groupings и cost
 * summary. Distinct от human-in-the-loop-gate: HITL-pause ждёт ввода
 * (input data), а plan-preview ждёт решения (yes/no/edit).
 *
 * Matching-only candidate. Promotion в stable + apply требует:
 *   - schema для batch-intent с массивом effects;
 *   - renderer primitive `<PlanPreview>` с group-by-entity collapse;
 *   - per-effect approve/reject toggle для partial-approve;
 *   - cost-estimator hook для бизнес-метрик в preview.
 */
export default {
  id: "agent-plan-preview-approve",
  version: 1,
  status: "candidate",
  archetype: null, // cross — любой archetype, где агент предлагает batch
  trigger: {
    requires: [
      { kind: "has-role", roleBase: "agent" },
      { kind: "intent-confirmation", confirmation: "preapproval" },
    ],
  },
  structure: {
    slot: "body",
    description: "Между intent.proposed и intent.confirmed появляется промежуточный экран `pendingPlan`: ordered-list effects, сгруппированных по mainEntity. Каждый effect рендерится как diff-card (was → will-be), с пометкой kind (create / update / delete / cascade), cost/risk-tag. Header — meta: who-asked-agent, когда сгенерирован plan, сколько effects, агрегированный cost. Footer — primary CTA «Approve all + execute», secondary «Reject all», tertiary toggle '◐ partial' (per-effect checkbox-list). Approve превращает proposed → confirmed по всему batch'у; reject — отбрасывает draft Φ.",
  },
  rationale: {
    hypothesis: "AI-агент способен сгенерировать десятки effect'ов в одну транзакцию — пакетный perform-many. Inline confirm на каждом effect'е разрушает скорость работы агента; auto-apply без preview ломает доверие (агент может ошибиться). Plan-preview-approve — золотая середина: один act of decision, но с полным обзором изменений и опциональной частичной коррекцией. Это формализует UX-паттерн, который AI-вендоры (Cursor, Claude Code, Aider, Devin) реализуют каждый по-своему через diff-views, multi-edit panels или structured tool-call previews.",
    evidence: [
      { source: "Cursor / Claude Code / Aider", description: "Multi-file edit preview с per-file accept/reject + 'apply all' / 'reject all' top-level controls", reliability: "high" },
      { source: "Terraform plan / OpenTofu", description: "`terraform plan` показывает structured changes (+/-/~) сгруппированные по resource'у; `terraform apply` подтверждает целиком", reliability: "high" },
      { source: "Git interactive rebase / rebase --interactive", description: "Список commit-операций до их применения; per-line edit перед commit", reliability: "high" },
      { source: "GitHub bulk PR review", description: "Squash-merge preview показывает агрегированный список commits с possibility skip отдельных hunks", reliability: "medium" },
      { source: "Database migration preview tools (Flyway, Liquibase)", description: "Pre-apply diff против текущего state схемы с visual diff", reliability: "high" },
      { source: "AI-coding assistant agent-mode", description: "Все коммерческие AI-coding агенты предъявляют patch-preview перед apply", reliability: "high" },
      { source: "Refactoring preview в IDE (IntelliJ/VSCode)", description: "Search & Replace preview, Rename refactor с per-occurrence toggle", reliability: "high" },
    ],
    counterexample: [
      { source: "irreversible-confirm dialog", description: "Single-effect intent — preview не нужен, достаточно one-click confirm", reliability: "high" },
      { source: "auto-execute low-risk agent intent", description: "Если irreversibility='low' и effect один — agent может execute сам без preview", reliability: "high" },
      { source: "human-in-the-loop-gate", description: "Запрашивает input от supervisor'а, не plan-decision (different intent shape)", reliability: "medium" },
      { source: "background batch-jobs без agent-роли", description: "Cron-job без агентской роли не нуждается в interactive plan-approve", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "compliance", projection: "agent_amendments_plan", reason: "Compliance-agent предлагает batch amendments к attestations — supervisor должен видеть весь plan и approve целиком" },
      { domain: "invest", projection: "agent_rebalance_plan", reason: "Investment-agent предлагает rebalance portfolio через несколько transactions — preapproval с per-transaction toggle" },
      { domain: "delivery", projection: "dispatcher_reassign_plan", reason: "Dispatcher-agent предлагает reroute нескольких courier'ов одновременно" },
      { domain: "workflow", projection: "agent_workflow_edit", reason: "AI-агент предлагает batch-edit на canvas (add 5 nodes + connect 4 edges + reconfigure 2 cubes)" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "place_bid", reason: "Single-actor single-effect — нет агентской роли и нет batch'а" },
      { domain: "messenger", projection: "send_message", reason: "Conversational input, не batch-plan" },
      { domain: "booking", projection: "create_booking", reason: "Single-effect intent от owner-роли, не agent" },
      { domain: "lifequest", projection: "complete_habit", reason: "Personal log — нет агентской роли" },
      { domain: "reflect", projection: "log_mood", reason: "Owner-only single-effect, no preapproval semantics" },
    ],
  },
};
