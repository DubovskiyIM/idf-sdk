---
"@intent-driven/core": minor
---

feat(core): закрытие §12.1 + §12.2 (Notion field test follow-ups)

**§12.1 — `projection.archetype` → `projection.kind` unification.** Manifesto использует термин `archetype` (feed/catalog/detail/canvas/dashboard/wizard/form), runtime SDK читает `projection.kind`. 7 из 14 доменов писали `archetype:` — materializer'ы (`materializeAsDocument` / `materializeAsVoice`) не находили switch-case → пустой output. Закрытие: новый `normalizeProjection(proj)` / `normalizeProjections(map)` копирует `archetype` → `kind` если `kind` отсутствует. Применён в трёх местах:
- `crystallizeV2` entry — нормализация PROJECTIONS map перед iteration.
- `materializeAsDocument` entry — single projection.
- `materializeAsVoice` entry — single projection.

Идемпотентен, не мутирует input, no-op если `kind` уже задан.

**§12.2 — Voice materializer primary-field discovery.** Hard-coded `r.name || r.title || r.ticker || r.id` в трёх местах (voiceCatalog/voiceDetail/voiceFeed) ломал озвучку для доменов с нестандартными primary-field именами. Закрытие: новый `getPrimaryFieldName(entityDef)` / `getPrimaryFieldValue(row, entityDef)` с приоритетом:
1. Явный `fieldRole: "primary"` или legacy `"primary-title"`.
2. Hardcoded fallback names: `name` / `title` / `label` / `displayName` / `ticker`.
3. Первое text-поле (не `id`).
4. `"id"` ultimate fallback.

Voice материализатор теперь принимает `ontology` через `opts` (был и раньше) и пробрасывает в catalog/detail/feed/dashboard helpers. Notion Page (`title` field) озвучивается корректно: «первый: Engineering Wiki» вместо «первый: undefined».

**Public API:**
- `normalizeProjection(projection)`
- `normalizeProjections(projections)`
- `getPrimaryFieldName(entityDef)`
- `getPrimaryFieldValue(row, entityDef)`

**Backward-compat.** Все 4 helper'а — additive. `archetype` остаётся в projection (не удаляется). Старые domains с `kind:` или с hardcoded `name`/`title` работают как раньше.

**Tests.** 26 новых (7 normalizeProjection / 12 getPrimaryFieldName / интеграция через materializer тесты). 1697/1697 общий core suite без регрессий.
