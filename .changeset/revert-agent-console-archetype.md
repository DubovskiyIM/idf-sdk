---
"@intent-driven/renderer": minor
---

revert(renderer): убрать AgentConsole из archetype list

Архитектурный реверт PR #304 + #351. AgentConsole — НЕ archetype.

**Почему не archetype:**

Archetype в IDF format — это **структурный shape** проекции
(catalog/detail/feed/form/canvas/dashboard/wizard). Это **declarative
structure** над данными — composable across 4 reader'ов (pixels/voice/
agent/document) с осмысленным mapping каждый.

AgentConsole — это **interaction modality** (chat-стиль dialog с AI-
агентом) поверх pixels reader + agent API. Это **поведение**, не
структура. Не маппится на voice/document readers (там это уже сама
modality, не shape).

Конфлация двух осей:
  - shape (archetype) — что показывать
  - modality (reader) — как взаимодействовать

**Где AgentConsole живёт правильно:**

В **host-extension layer** — opt-in module package или domain-specific
component. Не format core. Demo-modules не должны inflating archetype
list (closed enum 7 archetypes остаётся стабильным; новые UX patterns
живут в Pattern Bank или extensions).

**Что revert'нуто:**

1. Удалены `packages/renderer/src/archetypes/AgentConsole/` (4 файла +
   тест) — port в `idf-runtime/web/src/extensions/agent-console-demo/`.
2. `packages/renderer/src/archetypes/index.js` — убран AgentConsole export.
3. `packages/renderer/src/ProjectionRendererV2.jsx` — убран import и
   `agent_console: AgentConsole` запись из ARCHETYPES dict (PR #351).

**Не revert'нуто (отдельным sprint'ом):**

- crystallize_v2 — никогда не имел agent_console branch на main (PR #353
  был closed без merge).

**Следующие шаги (за пределами этого PR):**

- idf-runtime PR — extension layer `web/src/extensions/agent-console-demo/`
- idf-studio PR — invest template `agent_console.archetype: "canvas"` +
  `extension: "agent-console-demo"` marker
- Manifesto v2 — короткая глава «Extension surface vs format core» (TBD).
