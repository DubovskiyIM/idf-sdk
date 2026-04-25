---
"@intent-driven/core": minor
---

feat(patterns): diff-preview-before-irreversible — diff внутри ConfirmDialog для structured mutations

Promote из argocd-pattern-batch (2026-04-24). `irreversible-confirm` показывает «вы уверены?» без ЧТО изменится. Для structured mutations (YAML, config, schema) diff-preview снижает accidental irreversibility.

**Trigger**: irr=high intent + structured-type entity fields (object/yaml/json/manifest). **Apply**: добавляет `overlay.diffPreview = { enabled: true }` к confirmDialog overlays для irr:high intents. Эталоны: ArgoCD Rollback diff, Spinnaker side-by-side version diff, Terraform plan preview.
