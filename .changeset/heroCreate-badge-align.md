---
"@intent-driven/core": minor
"@intent-driven/renderer": minor
---

**heroCreate multi-param filter + Badge sx + witness alignSelf** (backlog §9.10 – §9.12, post-merge follow-up to #179).

Три SDK-гапа, не попавшие в первую волну workzilla post-bump fixes из-за squash-merge timing'а.

### §9.10 — `heroCreate` match отсекает multi-param creator'ов

Existing check учитывал только `witnesses.length > 1`. Multi-field creator (создать Task — title / description / budget / categoryId / deadline / …) match'ился heroCreate-архетипом и рендерился как hero-input на одно поле — способа открыть полноценную форму не было. Автор вынужден был писать `control: "formModal"` explicit override.

- Добавлен check по `userVisibleParams.length > 1` (считая `intent.parameters` и `particles.parameters`, исключая `id`). Multi-field creator'ы теперь уходят в formModal → catalog-creator-toolbar pattern (кнопка в toolbar + overlay с полной формой).

### §9.11 — `Badge` primitive пропускает `node.sx` в AdaptedBadge

Раньше `<AdaptedBadge color={tone}>` не получал `node.sx`. AntD Tag внутри flex-column-родителя (`align-items: stretch` default) стретчился на всю ширину карточки — выглядит как полоса вместо тега.

- Обёртка `<span style={{display: "inline-flex", ...node.sx}}>` — shrink-to-content + пробрасывает `alignSelf` / другие overrides к Tag'у.

### §9.12 — `witnessItemChildren` эмитит `sx.alignSelf` для compact primitives

Badge / timer witness-дети автоматически получают `sx: {alignSelf: "flex-start"}`. Catalog-card layout перестаёт стретчить их на ширину карточки — даже если адаптер отсутствует и используется fallback span.

---

**Тесты:** 2 expectation-update (`witnessItemChildren.test.js`) + фикс `nativeScaffold.test.js` (убран inconsistent `confirmation: "enter"` на 3-param creator'е — normalize инферит `"form"`). Core 1181 → 1181 green, renderer 297, adapter-antd 22.

**Host-side impact:** после bump'а workzilla-clone сможет убрать:
- `createTaskDraft.control: "formModal"` explicit override (heroCreate сам откажется).
- `overrides.css` с `.ant-tag { align-self: flex-start }` (§9.11 делает то же через JSX).
