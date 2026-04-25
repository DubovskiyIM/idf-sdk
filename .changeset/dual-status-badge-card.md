---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

feat(patterns): dual-status-badge-card — карточка catalog'а с двумя orthogonal status-badge'ами

Promote'ится из argocd-pattern-batch (2026-04-24, ArgoCD/Flux/Spinnaker/Rancher batch). Status-driven admin (GitOps, K8s, CI/CD) выводит ≥2 независимых status-axes на одну карточку — ArgoCD Application имеет sync (Synced/OutOfSync/Unknown) + health (Healthy/Progressing/Degraded/...). Один derived badge скрывает orthogonality и diagnostic info.

**Trigger**: catalog + mainEntity содержит ≥2 enum-полей-status (fieldRole === "status" ИЛИ name endsWith "Status"/"State"/"Phase") в witnesses проекции.

**Apply order**: после grid-card-layout (badges релевантны только в card-визуале). Расширяет cardSpec через `badges: [{bind, label, values}, ...]`. Backfill'ит legacy `cardSpec.badge` ← `badges[0]`. No-op если author уже задал badges или body.layout != grid.

**Renderer**: GridCard читает `cardSpec.badges` array, рендерит chip-style atoms; fallback на single `cardSpec.badge` для backward-compat.
