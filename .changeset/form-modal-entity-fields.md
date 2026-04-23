---
"@intent-driven/core": minor
---

Fix G-K-20: для α=replace intents `formModal` overlay теперь включает
`entity.fields` (editable parameters сущности) в дополнение к
path-params из `intent.parameters`. Без этого update-form показывал
только идентификаторы (`{realm, groupId, realmId}`) и не редактировал
настоящие поля (`name`, `description`, `path`, `attributes` и т.п.).

`wrapByConfirmation` signature расширен:
```js
wrapByConfirmation(intent, intentId, parameters, { projection, ontology })
```

`controlArchetypes::formModal.build` для α=replace intents merge'ит
`ontology.entities[mainEntity].fields` в `overlay.parameters`:
- system fields (`id`, `createdAt`, `updatedAt`, `deletedAt`) — skip
- duplicates с path-params — skip
- enum fields → `control: "select"` + options
- boolean → `control: "checkbox"`
- datetime/date → `control: "datetime"`
- textarea → `control: "textarea"`
- остальное — text input

3 caller'а в `assignToSlots*` обновлены передавать `ontology: ONTOLOGY`
в context. Без `ontology` в context — fallback на старое поведение
(только parameters), backward-compat.

Discovered в Keycloak dogfood-спринте 2026-04-23 (G-K-20). updateGroup
modal показывал {Realm, Group Id, Realm Id} вместо real Group fields
(name, path, description, subGroupCount, attributes).

6 unit-tests + full core suite 1272/1272 green.
