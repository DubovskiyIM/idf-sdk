/**
 * Permission inheritance (§12.8 Notion field test, P0).
 *
 * Декларативный API для cascade'ной видимости row'ов по иерархии:
 *   row → override на этой row → если нет, родитель → ... → root entity → fallback.
 *
 * Закрывает реальный gap полевого теста Notion (18-й, 2026-04-26): permission
 * наследование Page → parent Page → Workspace.defaultPermissionLevel
 * не выражалось в формате — host'ы вынуждены писать кастомный фильтр.
 *
 * Применимо к любой self-referential domain'е с per-row ACL: Notion / Confluence /
 * Filesystem / Org-tree / Wiki-spaces.
 *
 * Schema:
 *   Page: {
 *     permissionInheritance: {
 *       via: "pagePermissions",          // collection с override'ами
 *       matchField: "pageId",            // поле override → row.id
 *       userField: "userId",             // поле override → viewer.id
 *       levelField: "level",             // поле override с уровнем
 *       parentField: "parentPageId",     // self-ref FK; null = root
 *       rootEntity: "Workspace",         // entity-fallback (опц.)
 *       rootMatchField: "workspaceId",   // поле row → root.id
 *       rootLevelField: "defaultPermissionLevel",
 *       levels: ["none", "view", "comment", "edit"],
 *       requiredLevel: "view",           // минимум для visible (default: "view")
 *     }
 *   }
 *
 * Семантика:
 *   1. Идём по chain row.parentField, собираем override'ы для viewer
 *      (matchField === ancestor.id AND userField === viewer.id).
 *   2. Closest override побеждает (override на самой row > override на parent).
 *   3. Если override не найден — читаем root entity (rootEntity[row[rootMatchField]][rootLevelField]).
 *   4. Защита от циклов: max 64 hops в parent chain.
 */

const REQUIRED_FIELDS = [
  "via", "matchField", "userField", "levelField", "parentField", "levels",
];
const DEFAULT_REQUIRED_LEVEL = "view";
const MAX_PARENT_HOPS = 64;

/**
 * Проверяет, что entity имеет валидный permissionInheritance config.
 * @param {object} entityDef
 * @returns {boolean}
 */
export function isInheritablePermission(entityDef) {
  const cfg = entityDef?.permissionInheritance;
  if (!cfg || typeof cfg !== "object") return false;
  for (const f of REQUIRED_FIELDS) {
    if (cfg[f] == null) return false;
  }
  if (!Array.isArray(cfg.levels) || cfg.levels.length < 2) return false;
  return true;
}

/**
 * Резолвит уровень доступа viewer'а к row через inheritance chain.
 *
 * @param {object|null} row             — целевая строка
 * @param {string|null} viewerId        — viewer.id
 * @param {object} config               — entity.permissionInheritance
 * @param {object} world                — folded world
 * @returns {string|null} — level из config.levels, либо null если нет данных
 */
export function resolveInheritedPermission(row, viewerId, config, world) {
  if (!row || !viewerId || !config || !world) return null;
  const {
    via, matchField, userField, levelField, parentField,
    rootEntity, rootMatchField, rootLevelField, levels,
  } = config;

  const overrides = world[via];
  if (!Array.isArray(overrides)) {
    // collection отсутствует — можно работать только с root fallback
  }

  // Идём по parent chain: walk up до null parent или MAX_PARENT_HOPS.
  // Для каждого ancestor — ищем override от viewer'а.
  // Closest override побеждает (первый найденный = closest, идём root-down).
  // Cycle defense: visited Set.
  const visited = new Set();
  let cur = row;
  let hops = 0;
  while (cur && hops < MAX_PARENT_HOPS) {
    if (visited.has(cur.id)) break;
    visited.add(cur.id);

    // Override для текущего ancestor?
    if (Array.isArray(overrides)) {
      const override = overrides.find(o => o[matchField] === cur.id && o[userField] === viewerId);
      if (override) {
        const lvl = override[levelField];
        if (typeof lvl === "string" && levels.includes(lvl)) return lvl;
      }
    }

    // Идём вверх
    const parentId = cur[parentField];
    if (parentId == null) break;
    cur = findRowById(world, parentField, row, parentId);
    if (!cur) break;
    hops++;
  }

  // Override не найден в цепочке — fallback на root entity.
  if (rootEntity && rootMatchField && rootLevelField) {
    const rootRefId = row[rootMatchField];
    if (rootRefId != null) {
      const rootRow = findRowByIdInEntity(world, rootEntity, rootRefId);
      if (rootRow) {
        const lvl = rootRow[rootLevelField];
        if (typeof lvl === "string" && levels.includes(lvl)) return lvl;
      }
    }
  }

  return null;
}

/**
 * Проверяет, имеет ли viewer достаточный уровень для visibility.
 *
 * @param {string|null} effectiveLevel  — результат resolveInheritedPermission
 * @param {object} config               — entity.permissionInheritance
 * @returns {boolean}
 */
export function isPermissionSufficient(effectiveLevel, config) {
  const required = config.requiredLevel || DEFAULT_REQUIRED_LEVEL;
  const levels = config.levels;
  const got = levels.indexOf(effectiveLevel);
  const need = levels.indexOf(required);
  if (need < 0) return false;
  return got >= need;
}

// ─── Helpers ───────────────────────────────────────────────────────

// Lookup row в той же коллекции что и `referenceRow` по id.
function findRowById(world, _parentField, referenceRow, targetId) {
  // Пытаемся найти target в той же коллекции, что referenceRow.
  // Для performance — линейный scan; в больших мирах нужен индекс.
  for (const collectionName of Object.keys(world)) {
    const coll = world[collectionName];
    if (!Array.isArray(coll)) continue;
    if (coll.includes(referenceRow)) {
      return coll.find(r => r.id === targetId) || null;
    }
  }
  return null;
}

// Inline pluralize/camelPluralize — duplicate'ит логику из filterWorld.js,
// но share-helper выделять отдельным sub-sprint'ом (отмечено в backlog).
function pluralize(word) {
  if (!word) return word;
  if (word.endsWith("y")) return word.slice(0, -1) + "ies";
  if (word.endsWith("s")) return word + "es";
  return word + "s";
}

function camelPluralize(entityName) {
  if (!entityName) return entityName;
  const head = entityName[0].toLowerCase() + entityName.slice(1);
  return pluralize(head);
}

function findRowByIdInEntity(world, entityName, id) {
  const candidates = [camelPluralize(entityName), pluralize(entityName.toLowerCase())];
  for (const key of candidates) {
    const rows = world[key];
    if (Array.isArray(rows)) {
      const row = rows.find(r => r.id === id);
      if (row) return row;
    }
  }
  return null;
}
