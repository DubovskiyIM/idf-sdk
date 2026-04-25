---
"@intent-driven/core": minor
---

feat(patterns): resource-hierarchy-canvas — sub-collection с self-FK + status автоматически рендерится как resourceTree

Promote'ится из argocd-pattern-batch (2026-04-24, ArgoCD/Flux/Spinnaker/Rancher batch). **Закрывает backlog §10 G-A-2** (ArgoCD inline-children resources): host больше не должен вручную выставлять `section.renderAs = { type: "resourceTree", ... }` для tree-shaped sub-entities.

**Trigger**: detail + sub-entity (FK to mainEntity) с собственным self-referential FK (parentXxxId / parentId / explicit FK to self) + ≥1 status-like enum-полем (fieldRole === "status" ИЛИ name endsWith "Status"/"State"/"Phase"/"Health").

**Apply**: для каждой section в slots.sections, чьё itemEntity матчит, выставляет `section.renderAs = { type: "resourceTree", parentField, nameField, kindField?, badgeColumns: [{field, label}] }`. Renderer dispatcher (renderer/src/archetypes/SubCollectionSection.jsx §10.4c) подхватывает и рендерит через `<ResourceTree>` primitive. Author-override: no-op если `section.renderAs.type` уже задан.

**Эталоны**: ArgoCD Application resource tree (Deployment → ReplicaSet → Pod), Kubernetes Dashboard ownerReferences graph, Temporal child workflows, Lens IDE.

Renderer-инфраструктура (`ResourceTree` primitive, `renderAs.type === "resourceTree"` dispatcher) уже существовала из ArgoCD Stage 5 host-workaround — pattern автоматизирует выставление config'а.
