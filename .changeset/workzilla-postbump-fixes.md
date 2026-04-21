---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
"@intent-driven/adapter-antd": minor
---

**Workzilla post-bump SDK fixes** (backlog §9.1 – §9.6).

Пять SDK gap'ов, обнаруженных после релиза 0.50/0.26 при интеграции workzilla-clone. Закрыты одной волной.

### 9.1 — native `type: "string" / int / float` → canonical control

`inferControlType` на строке 65 возвращал `param.type` напрямую, без `mapOntologyTypeToControl`. Importer-generated + scaffold авторы, использующие `type: "string"` (Prisma/OpenAPI vocabulary), получали `unknown parameter control type: "string"` в `validateArtifact`.

- `mapOntologyTypeToControl` принимает `string → "text"`, `int/integer → "number"`, `float/double/bigint → "number"`, `bool → "select"`.
- `inferControlType` применяет маппинг к explicit `param.type`.

### 9.2 — `deriveProjections` auto `idParam` на detail

Standalone detail-projections (R3) получали `idParam: undefined`. ArchetypeDetail без `idParam` не мог достать target из `routeParams` — click по item в list давал EmptyState.

- `projections.<entity>_detail.idParam = "<entityLower>Id"` (convention).
- Singleton R3b (`my_<entity>_detail.singleton:true`) остаются без idParam (их владелец — viewer).

### 9.3 — `onItemClick` routing предпочитает matching mainEntity

При ≥2 outgoing `item-click` edges из list-projection SDK выбирал первый по алфавиту — часто wrong entity. `task_list.onItemClick` уходил в `response_detail` вместо `task_detail`.

- Prefer edge, у которого `toProj.mainEntity === fromProj.mainEntity`; fallback — alphabetical first.

### 9.4 — `ArchetypeForm` header адаптер-aware

Navigation bar (← Отмена / title / Создать) был hardcoded iOS-glass (`backdropFilter: blur(20px)`, SF blue `#007aff`, SF font). Для AntD/Mantine-хостов — визуально чужеродно.

- `getAdaptedComponent("shell", "formHeader")` — если адаптер предоставил, используется.
- `getAdaptedComponent("button", "primary/secondary")` — fallback к адаптерным кнопкам в neutral-header.
- `@intent-driven/adapter-antd` добавил `AntdFormHeader` (AntD Button + typography).
- Neutral native fallback через CSS-vars (`--idf-primary / --idf-border`).

### 9.5 — `ArchetypeForm` `projection.name` guard

Bare `{projection.name}` в header крэшил `Cannot read properties of undefined (reading 'name')` когда host не передавал `projection` prop. Теперь: `projection?.name ?? parentCtx?.artifact?.name ?? ""`.

### 9.6 — core exports для host-authored flows

Ранее synthesized projections (`generateCreateProjections`, `buildCreateFormSpec`) были internal — host мог получить только артефакт, не projection definition. Теперь доступны top-level:

```js
import {
  generateCreateProjections, buildCreateFormSpec,
  mapOntologyTypeToControl,
  normalizeIntentNative, normalizeIntentsMap,
} from "@intent-driven/core";
```

Host может использовать для custom debug / inspector / form-derivation без повторного вызова `crystallizeV2`.

### 9.10 — `heroCreate` match отсекает multi-param creator'ов

Existing check учитывал только `witnesses.length > 1`. Multi-field creator (создать Task — title / description / budget / categoryId / deadline …) match'ился и рендерился как hero-input с одним полем без way открыть полную форму.

- Добавлен check по `userVisibleParams.length > 1` (считая `intent.parameters` и `particles.parameters`, исключая `id`). Такие creator'ы уходят в formModal → catalog-creator-toolbar.

### 9.11 — `Badge` primitive пропускает `sx` в AdaptedBadge

Раньше `<AdaptedBadge color={tone}>` не получал `node.sx`. AntD Tag внутри flex-column-родителя (`align-items: stretch`) стретчился на всю ширину карточки — выглядит как полоса вместо тега.

- Обёртка `<span style={{display: "inline-flex", ...node.sx}}>` — gives shrink-to-content + пропускает `alignSelf`/другие overrides к Tag'у.

### 9.12 — `witnessItemChildren` эмитит `alignSelf` для compact primitives

Badge / timer witness-дети автоматически получают `sx: {alignSelf: "flex-start"}`. Catalog-card layout перестаёт стретчить их на ширину карточки (дефолт `align-items: stretch` во flex-column).

---

**Тесты:** 11 новых integration (`workzillaPostBump.test.js`). Core: 1170 → 1181.
