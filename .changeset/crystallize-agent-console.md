---
"@intent-driven/core": minor
---

feat(crystallize): agent_console archetype passthrough в crystallize_v2

agent_console (8-й archetype, добавлен в renderer 0.48 через PR #304)
не имел crystallize-side support. Default ветка else в archetype-dispatch
(crystallize_v2/index.js) попадала в `assignToSlots`, который
синтезирует catalog/feed/detail body по mainEntity. Это означало:
agent_console projection в проде рендерилась как **catalog по
mainEntity**, не как ChatInput + SSE timeline.

Симптом в Fold invest tenant'е: после bumps + ROOT_PROJECTIONS fix
sidebar показывает 3 items, agent_console попадает первым, но клик
рендерит catalog Portfolio rows вместо AgentConsole UI.

Fix:
1. Добавлен branch `else if (archetype === "agent_console")` —
   passthrough body `{type: "agent_console", mainEntity}`. Renderer
   AgentConsole archetype (PR #351 dispatch) распакует.
2. Pattern Bank apply skip для agent_console (custom archetype без
   slots-структуры, structure.apply не применим).
