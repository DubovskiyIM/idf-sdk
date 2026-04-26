---
"@intent-driven/renderer": minor
---

fix(renderer): зарегистрировать AgentConsole в `ARCHETYPES` registry

`AgentConsole` archetype был добавлен в SDK 0.48.0 (PR #304) как
8-й archetype для tool-use streams (ChatInput + SSE timeline для
agent-демо). Файл `archetypes/AgentConsole/AgentConsole.jsx` существует,
экспорт через `archetypes/index.js` есть, но **dispatch dict
`ARCHETYPES` в `ProjectionRendererV2.jsx` его не содержит**.

Симптом: при `archetype: "agent_console"` рендерер делает lookup
`ARCHETYPES["agent_console"]` → undefined → fallback "Архетип не
поддержан" (или crystallize синтезирует catalog по mainEntity и
рендерит catalog вместо AgentConsole UI).

Fix: добавлен import + entry в registry. 1 строка.
