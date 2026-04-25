/**
 * Lifecycle-gates on run — declarative блокировки execute/publish от состояния
 * сущности с явным diagnostic-list причин для пользователя.
 *
 * Source: workflow-editor field-research 2026-04-25 (declarative WorkflowIssue
 * engine: NodeNotConnected / CallLlmNoModel / WorkflowNoTriggers / LoopNoLoopBack —
 * все блокировки run/publish собираются в один список с per-issue UI-anchor'ом).
 *
 * Концепция: detail-projection «runnable» сущности (Workflow, Pipeline,
 * Campaign, Sandbox) рендерит на видном месте секцию `issues[]` —
 * derived-list блокирующих условий из cardinality / referential / expression
 * invariants + dynamic ontology rules. Каждый issue имеет severity
 * (block-execute / block-publish / warning), human-readable текст и
 * deep-link к полю/ноде. Primary CTA «Run» / «Publish» disabled до
 * resolve всех block-* issues; tooltip перечисляет первые 3.
 *
 * Distinct от phase-aware-primary-cta: тот меняет CTA-семантику по
 * lifecycle-status (Draft → Run → Stop). Lifecycle-gates-on-run — list
 * причин, почему действие *в принципе* недоступно, derived из инвариантов.
 *
 * Matching-only candidate. Promotion в stable + apply требует:
 *   - агрегатор `deriveIssues(entity, world, ontology)` поверх invariants;
 *   - renderer primitive `<IssueChecklist>` с deep-link;
 *   - convention `intent.gating: "block-execute"|"block-publish"|"warning"` в schema.
 */
export default {
  id: "lifecycle-gates-on-run",
  version: 1,
  status: "candidate",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "entity-field", field: "status", type: "select" },
      { kind: "intent-confirmation", confirmation: "lifecycle-gate" },
    ],
  },
  structure: {
    slot: "body",
    description: "Detail body получает секцию `issues` (visible когда issues.length > 0): grouped list по severity (block-execute / block-publish / warning). Каждый row — текст-описание + entity/field anchor link (clicking scrolls/jumps в нужное поле). Primary CTA в header — Run/Publish — disabled пока есть block-* issues; tooltip показывает первые 3 причины и счётчик. Issues отсчитываются от cardinality/referential/expression invariants (declarative; не imperative проверки).",
  },
  rationale: {
    hypothesis: "Когда сущность нужно `run`/`publish`, простое отключение primary CTA с silent disabled-state — главный UX-смелл: пользователь не понимает почему. Принцип явных gates: собрать все блокирующие условия в одном видимом списке, делегировать каждому issue deep-link к точке исправления, и явно объявить severity (block / warning). Это делает 'почему не работает' first-class info, а не диагностический quest. Пользователь движется по checklist'у вместо угадывания.",
    evidence: [
      { source: "workflow-editor field-research (2026-04-25)", description: "WorkflowIssue + canExecute/canPublish: ~20 declarative блокировок (NodeNotConnected / CallLlmNoModel / WorkflowNoTriggers / LoopNoLoopBack…) в одном списке, primary CTA disabled с tooltip", reliability: "high" },
      { source: "GitHub Actions workflow validation", description: "PR-status checks 'X failing checks' с per-check status и link до resolution", reliability: "high" },
      { source: "Vercel / Netlify deploy preview", description: "Build status panel с list ошибок, deploy disabled до их fix'а", reliability: "high" },
      { source: "Stripe Connect onboarding requirements", description: "Аккаунт не активируется до завершения checklist requirements; список явный, deep-links к каждому", reliability: "high" },
      { source: "Apple App Store Connect submit gates", description: "Submission заблокирован до resolve list of issues (missing screenshots, privacy URL...)", reliability: "high" },
      { source: "AWS / Azure resource validation pre-deploy", description: "Template-validation отчёт 'cannot deploy: 3 errors / 1 warning' с deep-link", reliability: "high" },
      { source: "TypeScript / ESLint problem panel", description: "IDE-list problems по файлам с jump-to-line", reliability: "high" },
    ],
    counterexample: [
      { source: "phase-aware-primary-cta", description: "CTA меняет лейбл по фазе (Run → Stop); это другой паттерн (transition, не checklist)", reliability: "high" },
      { source: "form-validation inline-errors", description: "Per-field validation в момент ввода — это обычная form-archetype проверка, не lifecycle-gate", reliability: "high" },
      { source: "irreversible-confirm dialog", description: "Single-shot подтверждение, не агрегированный issue-list", reliability: "high" },
      { source: "feed/timeline без runnable-семантики", description: "Лента сообщений/событий не имеет 'run' actions", reliability: "high" },
      { source: "catalog list view", description: "Plain list — нет run-context, gates бессмысленны", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "workflow", projection: "workflow_detail", reason: "Workflow с status:'draft|published|running' и intent run_workflow с confirmation='lifecycle-gate' → issue-checklist + disabled CTA до resolve" },
      { domain: "compliance", projection: "attestation_cycle_detail", reason: "Cycle-close blocked если есть pending attestations / unresolved findings — list с deep-link" },
      { domain: "invest", projection: "rule_definition_detail", reason: "Rule cannot activate до полной spec (missing condition / threshold) — issue-list" },
      { domain: "delivery", projection: "campaign_detail", reason: "Promo-campaign cannot publish если zone-overlap или missing pricing — gate-list" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "conversation_detail", reason: "Send-message не имеет lifecycle-gate, только optional empty-validation" },
      { domain: "lifequest", projection: "habit_detail", reason: "Personal habit run — нет blocking-gates" },
      { domain: "sales", projection: "listing_detail", reason: "List/unlist — single-flag toggle, не aggregated checklist" },
      { domain: "booking", projection: "booking_detail", reason: "Confirm-booking — single-effect intent с simple invariants" },
      { domain: "reflect", projection: "mood_log", reason: "Append-only log без runnable phase" },
    ],
  },
};
