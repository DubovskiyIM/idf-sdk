---
"@intent-driven/core": minor
---

Паттерн `diff-preview-before-irreversible` (stable, cross, Sprint 1 P0 #5).

Расширяет `irreversible-confirm`: когда у mainEntity есть dual-state пара полей
(current/target, live/desired, before/after, fieldRole current-state/desired-state)
и intent с irreversibility === "high", добавляет `showDiff: true` + `diffFields`
в confirmDialog overlay.

Эталоны: ArgoCD rollback dialog (YAML diff), GitHub PR merge, Terraform plan output.
20 тестов (trigger.match ×7, structure.apply ×6, helpers ×4, schema ×3).
