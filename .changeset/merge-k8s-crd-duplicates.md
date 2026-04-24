---
"@intent-driven/importer-openapi": minor
---

feat(importer-openapi): mergeK8sCrdDuplicates — автомёрдж K8s CRD pattern

Kubernetes CRDs именуются в OpenAPI как `v<digits>(alpha|beta)?<digits>?<PascalName>`.
Importer создаёт две раздельные entities:
  - path-derived `Application` (fields:{id}, kind:"internal") из `/api/v1/applications/{name}`
  - schema-derived `v1alpha1Application` (все поля, kind:"embedded")

Теперь `mergeK8sCrdDuplicates(entities)` автомёрджит такие пары:
  - stub.id побеждает (синтетический PK)
  - full.fields заполняют все недостающие поля
  - kind: "internal" (unmark embedded из full)
  - full entity сохраняется для wrapper-refs (`v1alpha1ApplicationList.items[]`)
    — opt-in `opts.stripOriginal: true` удаляет

Case-insensitive lookup для PascalCase mismatch (`Applicationset` stub ←
`ApplicationSet` schema). Не handled автоматически: name mismatch типа
`Project` ← `v1alpha1AppProject` или semantic alias `Gpgkey` ←
`v1alpha1GnuPGPublicKey` — требует host-override.

Closes ArgoCD G-A-1 (host `K8S_CRD_MERGE` table становится removable
после применения этого helper'а в host reimport pipeline).

По образцу `mergeRepresentationDuplicates` (Keycloak G-K-1).
