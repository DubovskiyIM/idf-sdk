---
"@intent-driven/core": patch
---

fix(patterns): global-scope-picker apply должен push'ить node в array slots.header

§13b (Notion field-test 2026-04-27): pattern apply возвращал `slots.header` object'ом со scopePicker key, тогда как `assignToSlots*` инициализирует `slots.header = []` (array). Это ломало `ArchetypeDetail.SlotRenderer items.map is not a function` на любой detail-проекции в домене с scope entity (Notion Workspace, Argo Project, Keycloak Realm).

## Fix

`apply()` теперь:
- Читает existing `Array.isArray(slots.header)` (fallback `[]`)
- No-op если scopePicker уже присутствует — array node `{ type: "scopePicker" }` ИЛИ legacy object-form (backward-compat для уже-сохранённых artifact'ов)
- Push'ит `{ type: "scopePicker", entity, label, source }` в array

## Backwards-compat

Legacy authored override `slots.header = { scopePicker: {...} }` (object-form) — apply воспринимает как already-set, no-op. Renderer'ам, которые читают legacy form через `slots.header.scopePicker`, нужно переходить на iteration по array — но это рассматривается отдельно (нет известных потребителей кроме pattern apply само).

## Тесты

Все 9 тестов в `global-scope-picker.test.js` обновлены на array shape:
- helper `findScopePicker(header)` для ergonomics
- новый case: legacy object-form → no-op (backward-compat)
- existing-nodes preservation теперь проверяет array length вместо object spread

Полный core: **1841/1841 passing**.
