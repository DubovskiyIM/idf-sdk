---
"@intent-driven/core": minor
---

feat(patterns): spec-vs-status-panels — двухпанельная раскладка desired vs observed для declarative reconciliation

Promote'ится из argocd-pattern-batch (2026-04-24, flux-weave-gitops + ArgoCD + Spinnaker — 3 источника независимо). В декларативных reconciliation-системах (GitOps, K8s, Terraform, Flux/ArgoCD) пользователю критично различать "что я объявил" (spec) vs "что контроллер видит сейчас" (status/observed). Единая форма скрывает drift.

**Trigger**: detail + mainEntity с обоими слоями — spec (desired/config) + status (observed/live). Определяется через `entity.groups` (авторская аннотация) или convention-поля (spec/desired/config + status/observed/live).

**Apply**: выставляет `body.renderAs = { type: "specStatusSplit", specField, statusField }`. Renderer рендерит два panel'а: Desired (Spec) слева / Observed (Status) справа. Author-override: no-op если `body.renderAs` уже задан.
