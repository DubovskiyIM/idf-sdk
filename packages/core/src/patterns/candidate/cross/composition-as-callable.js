/**
 * Composition-as-callable — entity-as-tool (subworkflow / nested-component
 * вызывается как первоклассный шаг другого entity).
 *
 * Source: workflow-editor field-research 2026-04-25 (Subworkflow / WorkflowAsTool /
 * Pipeline / Iteration node-types), AI-agent vertical-stacks (chain-of-tools).
 *
 * Концепция: mainEntity помечена `kind: "callable"` (или содержит поле с
 * fieldRole='callable'/'tool'), означая что её можно встраивать в другую
 * сущность как step. UI на detail-projection такого entity предлагает
 * sidebar/section «Used by» (reverse-association) + «Run standalone»
 * primary CTA + parameter-bridge (схема входа/выхода видна в detail-form).
 *
 * Distinct от plain entity-reference: callable имеет input/output schema
 * (как RPC contract), может быть запущена сама по себе, и часто доступна как
 * tool через agent-API.
 *
 * Matching-only candidate. Promotion в stable + apply требует:
 *   - формализации `entity.kind: "callable"` (расширение taxonomy);
 *   - `entity.io: { input, output }` schema-blocks для parameter-bridge;
 *   - renderer primitive `<CallableInvocationCard>` для embedded-step UI;
 *   - agent-материализации через ту же io-схему.
 */
export default {
  id: "composition-as-callable",
  version: 1,
  status: "candidate",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "entity-kind", entityKind: "callable" },
    ],
  },
  structure: {
    slot: "body",
    description: "Detail-projection callable-entity получает три нестандартных секции: (1) `inputs` block — схема входных параметров с типами/валидаторами, рендерится как nested form-fragment; (2) `outputs` block — read-only схема результата с примерами; (3) `Used by` section — reverse-association на entity, ссылающиеся на эту callable как tool/subworkflow. Primary CTA — «Run standalone» (запуск callable напрямую с form-input'ом). Optional secondary — «Embed in workflow» (открыть picker родительских entity).",
  },
  rationale: {
    hypothesis: "В workflow/AI-agent доменах есть entities, которые играют двойную роль: они data-record (CRUD-управляемая запись) и operation (вызываемая единица работы). Plain detail-archetype не передаёт второе: нет input/output schema, нет «Used by», нет «Run standalone» primary CTA. Pattern формализует callable-shape: detail рендерит контракт явно (input schema + output schema), тем самым делая entity self-documenting и пригодной для embed в другие графы. Это сходится с концепцией tool-API в агентских стэках, где сущность одновременно — каталог записей и tool-bank.",
    evidence: [
      { source: "n8n custom nodes / subworkflows", description: "Subworkflow node — invoke another workflow with input/output schema. List of «Workflows that call this one» в detail", reliability: "high" },
      { source: "Temporal Activities + Workflows", description: "Activity / Workflow signature published как code; UI обычно показывает callers через workflow-history graph", reliability: "high" },
      { source: "Apache Airflow SubDagOperator", description: "Subdag — DAG, вызываемая из другого DAG; UI показывает родительскую цепочку", reliability: "high" },
      { source: "OpenAI / Claude / Anthropic Tools API", description: "Tool definition с JSON-schema input/output — каждая tool-сущность сама и data-record (для редактирования) и callable (для invoke)", reliability: "high" },
      { source: "GitHub Actions Reusable Workflows", description: "`uses: org/repo/.github/workflows/x.yml` — workflow становится callable через `workflow_call` trigger с input-схемой", reliability: "high" },
      { source: "Lambda / Cloud Functions invocation history", description: "Function detail показывает invocations + callers + input/output schema", reliability: "medium" },
    ],
    counterexample: [
      { source: "plain CRUD entity", description: "Customer / Order / Listing — это data-records без callable semantics. Reverse-association может быть нужна, но input/output schema — нет", reliability: "high" },
      { source: "configuration entity", description: "ApiKey / Credential / Setting — потребляются другими, но не вызываются как операция", reliability: "high" },
      { source: "event-stream record", description: "AuditEvent / Notification — append-only record, не invoke", reliability: "high" },
      { source: "feed-archetype timeline", description: "Сообщения, ленты — там вообще не detail-archetype, нет смысла tool-binding", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "workflow", projection: "subworkflow_detail", reason: "Subworkflow помечена `kind: 'callable'` с input/output schema — рендерится как embeddable tool" },
      { domain: "workflow", projection: "user_function_detail", reason: "Python-функция как callable: schema + Used-by section + Run standalone CTA" },
      { domain: "compliance", projection: "control_procedure", reason: "Control с input='evidence-uri', output='attestation-record' — может быть запущен сам по себе или вызван из cycle-runner" },
      { domain: "invest", projection: "rule_definition", reason: "Алгоритмическое правило с inputs (market-state) → output (signal) — callable из rule-engine и из ad-hoc backtest" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "listing_detail", reason: "Listing — data-record, не callable" },
      { domain: "messenger", projection: "conversation_detail", reason: "Conversation не invoke'ится как операция" },
      { domain: "booking", projection: "specialist_detail", reason: "Specialist — actor/profile, не функция" },
      { domain: "lifequest", projection: "habit_detail", reason: "Habit — trackable cadence, не tool" },
      { domain: "delivery", projection: "order_detail", reason: "Order — order-record, не invoke-able" },
    ],
  },
};
