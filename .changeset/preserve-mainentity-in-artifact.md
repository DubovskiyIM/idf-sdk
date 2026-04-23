---
"@intent-driven/core": patch
---

Fix: `crystallizeV2` теряет `mainEntity` и `entities` в построенных
артефактах. Это ломает downstream R8 hub-absorption host-side checks
и любую host-логику, которая фильтрует/группирует artifacts по
`mainEntity` (materializers document/voice/agent, host nav-graph
обогащение, custom hubSections без проброса проекций).

Repro:
```js
const artifacts = crystallizeV2(intents, projections, ontology);
artifacts.user_detail.mainEntity; // === undefined ❌ должно быть "User"
```

Fix: artifact builder теперь прокидывает `mainEntity: proj.mainEntity ||
null` и `entities: proj.entities || (proj.mainEntity ? [proj.mainEntity]
: [])`. `null` для projections без mainEntity (form/dashboard/canvas).

Discovered в Keycloak dogfood-спринте 2026-04-23. Без этого fix'а R8
hub-absorption не срабатывает на host-side для domain'ов где Realm/parent
имеет ≥2 child catalog'ов (User/Group/Role/Client/...) с FK references.
