---
"@intent-driven/renderer": minor
---

FormModal form-derive расширения для admin-domain auto-form поддержки:

- **`FormModal` экспортирован** в public API — host'ы могут напрямую рендерить FormModal без overlay registration (для случаев когда form-overlay state управляется host'ом). Дополнительно вынесен `ModalShell`.
- **`ColorPicker` primitive** — HTML5 color input + hex text + random refresh button (palette из 8 цветов). FormModal рендерит автоматически для `param.control === "color"` или `param.type === "color"`.
- **`KeyValueEditor` primitive** — key/value pairs editor с +/− кнопками; value — plain object `{[key]: value}`. FormModal рендерит для `param.control === "keyValue"` / `param.type === "keyValue"` или `type === "object"` без `values`.

Foundation для host gravitino Phase 3.13 — drop CreateTagDialog (color + properties) и CreatePolicyDialog (properties) через IntentFormDialog → FormModal pipeline.

Backward-compatible: новые types только опт-ин через intent.parameters.
