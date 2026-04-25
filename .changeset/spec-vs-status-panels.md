---
"@intent-driven/core": minor
---

feat(patterns): spec-vs-status-panels — двухпанельный split declarative/observed state

Promote'ится из flux-weave-gitops candidate (2026-04-24) в рамках ArgoCD dogfood sprint. В декларативных reconciliation-системах (GitOps, K8s, Terraform, Flux/ArgoCD) пользователю критично различать «что я задекларировал» (spec) vs «что контроллер применил» (status/observed). Плоский detail скрывает drift.

**Trigger**: detail + mainEntity имеет ≥1 spec-like поле (fieldRole==="spec" OR имя в spec-словаре: sourceRef, targetRevision, path, interval, chartVersion, desired...) AND ≥1 status-like поле (fieldRole==="status" OR имя в status-словаре: conditions, lastAppliedRevision, phase, health, syncStatus, message...).

**Apply**: выставляет `body.layout = "spec-status-split"` + `body.specFields` + `body.statusFields`. Author-override: no-op если `body.layout` уже задан. Экспортирует `_helpers: { detectSpecFields, detectStatusFields }` для тестов и reuse.
