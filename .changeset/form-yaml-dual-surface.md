---
"@intent-driven/core": minor
---

feat(patterns): form-yaml-dual-surface — toggle Form / YAML editor для declarative resources (closes G-A-7)

Promote из argocd-pattern-batch (rancher-manager candidate, 2026-04-24). **Закрывает backlog §10 G-A-7** (yamlEditor archetype в ArgoCD host). Declarative resources имеют bimodal аудиторию: новички — guided form, power-users — YAML manifest. Dual-surface с toggle решает задачу без выбора.

**Trigger**: form/detail + entity с yaml/manifest fields (type=yaml|json|manifest, fieldRole=manifest|spec|template), entity.resourceClass (k8s/helm/terraform), или K8s convention (apiVersion + kind + metadata).

**Apply**: form → slots.form.renderAs={type:"formYamlDualSurface"}; detail → slots.body.renderAs={type:"formYamlDualSurface"}. Author-override: no-op если renderAs задан.
