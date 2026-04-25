---
"@intent-driven/core": minor
---

feat(patterns): generator-preview-matrix — preview N generated instances перед bulk commit

Promote'ится из argocd-pattern-batch (2026-04-25, Sprint 1 P0 #6). **Закрывает backlog §10 G-A-3** (ApplicationSet generator preview gate): template-entity с bulk-creation intent получает preview-матрицу перед confirm'ом вместо «слепого» применения.

**Trigger**: detail + mainEntity имеет template-like field (name ∈ {template, spec, definition, generator, blueprint} ИЛИ fieldRole === "template") + поле generated output (name matches /generated|instances|applications|jobs|outputs/ ИЛИ fieldRole === "generated-instances") + хотя бы один bulk-creation intent (creates содержит [] ИЛИ intent.bulk === true ИЛИ creates !== mainEntity).

**Apply**: добавляет overlay `{ id: "generator_preview", type: "generatorMatrix", templateField, instancesField, columns, source }` к `slots.overlays`. Columns выводятся из generated-entity (name/namespace/cluster/status/id в порядке PREFERRED_COLUMNS) или fallback ["name", "id"]. No-op если overlay уже задан. Author-override: `projection.generatorPreview: false`.

**Эталоны**: ArgoCD ApplicationSet (generator → N Applications), GitHub Actions matrix (strategy.matrix), Jenkins build matrix, Terraform plan (preview gate).

Stable count: 39 → 40. 30 новых тестов (detectTemplateField × 8, detectGeneratedField × 5, trigger.match × 9, structure.apply × 8).
