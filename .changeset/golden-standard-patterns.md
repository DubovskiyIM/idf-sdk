---
"@intent-driven/core": minor
---

feat(patterns): 7 новых stable-паттернов из golden-standard batch

Pattern Bank растёт с 13 до **20 stable patterns** после исследования 5
золотых стандартов (Linear / Stripe / Notion / Height / Superhuman)
через `scripts/pattern-researcher-batch.mjs` (51 candidate, 7
promoted).

Cross-archetype (overlay-слой поверх любой projection):

- `global-command-palette` — ⌘K overlay для ≥15 intents. Конвергентный
  signal: Linear, Height, Superhuman (3 независимых match'а).
- `optimistic-replace-with-undo` — дуал к `irreversible-confirm`. Для
  частых reversible replace-ops (≥3 click-confirmation): undo-toast
  вместо modal. Signal: Linear property changes, Superhuman archive.
- `bulk-action-toolbar` — selection-triggered action bar, если домен
  объявляет ≥2 `bulk_*` intents. Signal: Height, Linear Triage, Gmail.

Catalog:

- `kanban-phase-column-board` — catalog-версия `phase-aware-primary-cta`.
  Триггер: status-field с ≥3 enum + replace-intents на `.status`.
  Apply (v1.13+): body.layout={type:"kanban", columnField:"status"}.

Detail:

- `keyboard-property-popover` — Linear-style sidebar. ≥4 replace-
  intents на mainEntity.* + click-confirmation. Inline-popover с
  type-specific picker + single-letter hotkey.
- `observer-readonly-escape` — observer-role + ≥1 high-irreversibility
  intent → единый primary CTA (Dispute/Escalate/Flag). Signal: Stripe
  payment-detail, invest alert-detail.
- `lifecycle-locked-parameters` — писаемы в draft-фазе, read-only
  после активации. Signal: Stripe subscription, IDF AgentPreapproval.

Каждый паттерн содержит rationale.evidence (источники signal'а),
counterexample (когда НЕ применим), falsification.shouldMatch /
shouldNotMatch (реальные domain+projection pairs из IDF prototype).

Отчёт с полной кластеризацией 51 кандидата: см. idf/refs/2026-04-18-
FINAL-REPORT.md.
EOF

Следующий шаг — прогон через matchPatterns() на 9 доменах IDF,
фактическая валидация shouldMatch/shouldNotMatch, apply-функции для
3-4 паттернов (planned v0.11).
