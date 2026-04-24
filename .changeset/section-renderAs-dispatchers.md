---
"@intent-driven/renderer": minor
---

`SubCollectionSection` поддерживает `renderAs: { type: "permissionMatrix" | "credentialEditor" }` — завершает Stage 8/9 (P-K-C / P-K-D) Keycloak.

Existing convention `section.renderAs` (сейчас `"eventTimeline"`) расширена двумя новыми dispatcher'ами:

**`permissionMatrix`** (P-K-D — role-mappings matrix):
```js
{
  title: "Role mappings",
  source: "roleMappings",
  foreignKey: "userId",
  renderAs: {
    type: "permissionMatrix",
    privileges: ["manage", "view", "invoke"], // optional explicit columns
    readOnly: true,                            // default
  },
}
```
Filtered items (по foreignKey) → `PermissionMatrix.value`. Inheritance badges (idf-sdk#269) видны автоматически из `item.inheritedFrom`.

**`credentialEditor`** (P-K-C — multi-kind credentials):
```js
{
  title: "Credentials",
  source: "credentials",
  foreignKey: "userId",
  renderAs: {
    type: "credentialEditor",
    readOnly: false,
    actionIntents: { rotate: "resetUserPassword", delete: "removeCredential" },
    actionsByType: { /* override per-type actions */ },
  },
}
```
Actions → `ctx.exec(actionIntents[action], { credentialId, id })`. Discriminator-driven primitive (idf-sdk#272) с 4 типами.

Без `renderAs` — поведение не меняется (default `SubCollectionSection` list rendering). `renderAs.type === "eventTimeline"` — существующий path.

Unblocks Keycloak Stage 8/9 полноценный UI: user_detail projection с `{ entity: "RoleMapping", renderAs: { type: "permissionMatrix" } }` + `{ entity: "Credential", renderAs: { type: "credentialEditor" } }` автоматически рендерится через primitive'ы с type-specific views.

## Tests

`SubCollectionSection.behavior.test.jsx` +5 новых:
- permissionMatrix рендер + Alice filter / пустой no-op
- credentialEditor рендер + foreignKey filter / action exec / readOnly default

`@intent-driven/renderer`: **500 passed** (было 495, +5).
