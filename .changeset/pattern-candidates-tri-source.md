---
"@intent-driven/core": minor
---

feat(patterns): 4 candidate-паттерна из tri-source field research (2026-04-25)

Добавлены matching-only candidate'ы в `packages/core/src/patterns/candidate/`. Все четыре независимо проявились в трёх независимых production-стэках (два workflow-editor field-test'а + Angular-imperative legacy с 200+ полиморфными кубами и 18-fork brand-overlay), что подтверждает их как стабильные UX-формы:

- `cross/human-in-the-loop-gate` — приостановка execution до confirmation от человека-supervisor'а (отличается от irreversible-confirm: асинхронная пауза с возможной сменой actor'а, structured input).
- `cross/composition-as-callable` — entity-as-tool с input/output schema, «Used by» reverse-association, «Run standalone» CTA.
- `cross/agent-plan-preview-approve` — multi-effect plan-preview между agent-роли intent.proposed и intent.confirmed; partial-approve toggle.
- `detail/lifecycle-gates-on-run` — declarative issue-checklist (cardinality / referential / expression invariants) + disabled run/publish CTA + deep-link к причине.

Каждый имеет полный shape: trigger.requires (только существующие kinds), structure (slot + description, без apply), rationale (hypothesis + 4-7 evidence + 4-5 counterexample), falsification (4-5 shouldMatch / 4-5 shouldNotMatch).

Suite растёт: `CURATED_CANDIDATES.length` 6 → 10. 1517/1517 core-тестов зелёные (+16). Promotion в stable + structure.apply — отдельный sub-project на каждый паттерн (требует расширения trigger.kind taxonomy и новых renderer primitives).
