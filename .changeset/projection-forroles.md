---
"@intent-driven/core": minor
---

Role-aware projection filtering — `projection.forRoles` (backlog §4.9).

Projection author декларирует `forRoles: ["customer", "executor"]` — проекция
видима только viewer'ам с матчинг-активной ролью. Без `forRoles` — видима всем
(backward-compat).

**API:**
- `filterProjectionsByRole(ids, projections, activeRole)` → filtered ids
- `isProjectionAvailableForRole(projection, activeRole)` → boolean
- `partitionProjectionsByRole(ids, projections, activeRole)` → `{visible, hidden}`

**Freelance применение:** `my_tasks` → `forRoles:["customer"]`, `my_responses` →
`forRoles:["executor"]`, `my_deals` / `wallet` → `forRoles:["customer","executor"]`.
Host-сайд (V2Shell) применяет filter к `domain.ROOT_PROJECTIONS` после смены
`activeRole` — tab-bar реально меняется.

**Семантика:** declarative visibility над `activeRole` (session-scoped), не над
`role.base` (permission-scoped). Role.base фильтрует что viewer может делать;
forRoles фильтрует что viewer сейчас видит в nav.
