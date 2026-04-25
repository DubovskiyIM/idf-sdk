---
"@intent-driven/core": minor
---

feat(patterns): form-yaml-dual-surface — Form↔YAML toggle для declarative resources

Добавляет 40-й stable pattern. Trigger: detail + mainEntity имеет yaml/manifest-field
(fieldRole === "raw-manifest" | type === "yaml"|"json" | имя в ["yaml","spec","manifest","config","definition","template"])
+ хотя бы одно structured-field. Apply: добавляет `renderHint: "yamlToggle"` + `yamlField` к form/edit overlays без renderHint.

Closes backlog §10 G-A-7 (yamlEditor archetype для ArgoCD dogfood).

Evidence: ArgoCD Application.spec (5-tab form ↔ Edit YAML), Rancher Manager cluster/workload,
Lens IDE resource detail, OpenShift Console YAML/Form toggle.
