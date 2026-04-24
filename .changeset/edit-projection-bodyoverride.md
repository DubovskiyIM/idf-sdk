---
"@intent-driven/core": minor
---

`detail.editBodyOverride` → `<id>_edit.bodyOverride` (G-K-12 Keycloak).

Раньше только `<entity>_create` projection с `mode: "create"` + `bodyOverride` получал custom layout (TabbedForm / Wizard / etc). Synthesized `<id>_edit` projection из `formGrouping.generateEditProjections` игнорировал `bodyOverride` и всегда рендерил flat formBody — `row-CTA "Изменить"` давал default UI даже когда create использовал tabbedForm.

Теперь author может задать `editBodyOverride` на detail-projection:

```js
client_detail: {
  kind: "detail",
  mainEntity: "Client",
  idParam: "clientId",
  editBodyOverride: {
    type: "tabbedForm",
    tabs: [
      { id: "settings", title: "Settings", fields: [...], onSubmit: { intent: "updateClient" } },
      ...
    ],
  },
},
```

`generateEditProjections` копирует `editBodyOverride` в синтезированный `client_detail_edit` как `bodyOverride`. Renderer `ArchetypeForm` видит `body.type === "tabbedForm"` и делегирует в `TabbedForm` primitive (idf-sdk#263) / Wizard (idf-sdk#240).

## Conservative

- Non-object `editBodyOverride` игнорируется (paranoia guard)
- Explicit author'ский `<id>_edit` projection всё ещё wins (existing behavior — `if (PROJECTIONS[editProjId]) continue`)
- Без `editBodyOverride` — default flat formBody (back-compat)

## Tests

`formGrouping.test.js` +3:
- editBodyOverride → synth bodyOverride wizard-spec
- без override — bodyOverride undefined
- non-object paranoia guard

`@intent-driven/core`: **1296 passed**.

## Use-case Keycloak

Client.detail теперь может иметь same TabbedForm в edit-mode как в create через `editBodyOverride: clientCreateTabsSpec`. UI консистентен между «Создать client» wizard и row-action «Изменить client» — те же 5 tabs, те же поля.
