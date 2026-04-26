---
"@intent-driven/core": minor
---

feat(core): permission-inheritance API (§12.8 closure)

Декларативный `entity.permissionInheritance` для cascading visibility row'ов через self-referential parent chain с fallback'ом на root entity. Закрывает P0-gap из Notion field test (18-й полевой, 2026-04-26): permission-наследование Page → parent Page → Workspace.defaultPermissionLevel не выражалось в формате — host'ы были вынуждены писать кастомный фильтр в обход `filterWorldForRole`.

**API:**

```js
Page: {
  permissionInheritance: {
    via: "pagePermissions",          // collection с per-row override'ами
    matchField: "pageId",            // override.pageId === row.id
    userField: "userId",             // override.userId === viewer.id
    levelField: "level",             // override.level — текущий уровень
    parentField: "parentPageId",     // self-ref FK; null = root
    rootEntity: "Workspace",         // entity-fallback (опц.)
    rootMatchField: "workspaceId",   // row.workspaceId → Workspace.id
    rootLevelField: "defaultPermissionLevel",
    levels: ["none", "view", "comment", "edit"],
    requiredLevel: "view",           // минимум для visible (default: "view")
  }
}
```

**Семантика.** При фильтрации row для viewer'а: walk up `parentField` chain, ищется closest override (`matchField === ancestor.id AND userField === viewer.id`). Если не найден — fallback на `rootEntity[row[rootMatchField]][rootLevelField]`. Сравниваем effective level с `requiredLevel` через `levels.indexOf` (последний — highest). Защита от циклов: 64 hops max + visited Set.

**Owner-роли пропускают inheritance** (видят всё, как и до этого PR'а через `getOwnerFields` логику).

**Backward-compat.** Ontology без `permissionInheritance` ведёт себя как раньше — никаких изменений в существующих доменах.

**Применимо к.** Любой self-referential domain с per-row ACL: Notion / Confluence / Filesystem / Org-tree / Wiki-spaces.

**Public API:**
- `resolveInheritedPermission(row, viewerId, config, world)` → level | null
- `isInheritablePermission(entityDef)` → boolean
- `isPermissionSufficient(level, config)` → boolean
- Интегрировано в `filterWorldForRole` (3-й приоритет: scope > reference > **inheritance** > ownerField).

**Tests.** 19 новых (10 unit для resolve, 3 для validator, 6 интеграционных с filterWorld'ом). 1635/1635 общий core suite без регрессий.
