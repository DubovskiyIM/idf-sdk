/**
 * Фильтрация folded world для конкретной роли.
 *
 * Три прохода в одном циклу по entities ontology:
 *   1. row-filter: сначала role.scope[entity] (many-to-many через via-коллекцию),
 *      иначе entity.ownerField (single-field owner).
 *   2. field-filter через role.visibleFields[entity] (скрываем clientId и т.п.)
 *   3. status-mapping через role.statusMapping (held → booked)
 *
 * Коллекция, для которой в role.visibleFields нет записи, не возвращается
 * в output вовсе.
 *
 * Many-to-many через role.scope (§17, §26.1 закрытый):
 *   roles.advisor.scope.Portfolio = {
 *     via: "assignments",         // имя коллекции-моста
 *     viewerField: "advisorId",   // поле моста, матчится против viewer.id
 *     joinField: "clientId",      // поле моста, даёт set разрешённых id
 *     localField: "userId",       // поле target entity, матчится с joinField
 *     statusField: "status",      // опц. — фильтр активности
 *     statusAllowed: ["active"],  // опц. — только такие статусы моста
 *   }
 *
 * Семантика: advisor видит Portfolio row'ы, где
 *   row.localField ∈ { m[joinField] | m ∈ world[via], m[viewerField] === viewer.id,
 *                                      (opt) m[statusField] ∈ statusAllowed }
 */

import { getOwnerFields } from "./crystallize_v2/ontologyHelpers.js";
import {
  isInheritablePermission,
  resolveInheritedPermission,
  isPermissionSufficient,
} from "./permissionInheritance.js";

function pluralize(word) {
  if (!word) return word;
  if (word.endsWith("y")) return word.slice(0, -1) + "ies";
  if (word.endsWith("s")) return word + "es";
  return word + "s";
}

/**
 * Найти коллекцию в rawWorld для entity, пробуя несколько plural-форм:
 *   1. camelCase plural (AgentPreapproval → agentPreapprovals, RiskProfile → riskProfiles)
 *   2. lowercase plural (TimeSlot → timeslots) — legacy-convention некоторых доменов
 *   3. Last-CamelCase сегмент + s (TimeSlot → slots) — booking legacy
 *
 * outputName — всегда canonical camelCase plural: это public namespace для агента,
 * он не должен знать про внутренние legacy-формы домена. rows — данные из matching
 * коллекции (или []).
 */
function camelPluralize(entityName) {
  if (!entityName) return entityName;
  const head = entityName[0].toLowerCase() + entityName.slice(1);
  return pluralize(head);
}

function findCollection(rawWorld, entityName) {
  const camelPlural = camelPluralize(entityName);
  const lowerPlural = pluralize(entityName.toLowerCase());
  const candidates = [camelPlural];
  if (lowerPlural !== camelPlural) candidates.push(lowerPlural);
  const segments = entityName.match(/[A-Z][a-z]*/g) || [];
  if (segments.length > 1) {
    const lastPlural = pluralize(segments[segments.length - 1].toLowerCase());
    if (!candidates.includes(lastPlural)) candidates.push(lastPlural);
  }
  for (const cand of candidates) {
    if (Array.isArray(rawWorld[cand])) {
      return { outputName: camelPlural, rows: rawWorld[cand] };
    }
  }
  return { outputName: camelPlural, rows: [] };
}

/**
 * Вычисляет set разрешённых localField-значений через via-коллекцию.
 * Кэширует результат по (viewer.id, via) — один viewer обычно имеет
 * одну связку.
 */
function resolveAllowedIds(rawWorld, scope, viewer) {
  if (!scope?.via || !scope.viewerField || !scope.joinField) return null;
  const bridge = rawWorld[scope.via];
  if (!Array.isArray(bridge)) return new Set();

  const allowedStatuses = Array.isArray(scope.statusAllowed) && scope.statusAllowed.length > 0
    ? new Set(scope.statusAllowed)
    : null;

  const ids = new Set();
  for (const m of bridge) {
    if (m[scope.viewerField] !== viewer.id) continue;
    if (allowedStatuses && scope.statusField && !allowedStatuses.has(m[scope.statusField])) continue;
    const joinVal = m[scope.joinField];
    if (joinVal != null) ids.add(joinVal);
  }
  return ids;
}

function filterWorldForRole(rawWorld, ontology, roleName, viewer) {
  const role = ontology?.roles?.[roleName];
  if (!role) throw new Error(`Role "${roleName}" не найдена в ontology`);

  const visibleFields = role.visibleFields || {};
  const statusMapping = role.statusMapping || {};
  const scopes = role.scope || {};
  const filtered = {};

  for (const [entityName, entityDef] of Object.entries(ontology.entities || {})) {
    const allowed = visibleFields[entityName];
    if (!allowed) continue; // коллекция не видна этой роли

    const { outputName, rows } = findCollection(rawWorld, entityName);

    // 1) Row-filter: приоритет role.scope > entity.kind:"reference" >
    //    entity.permissionInheritance > entity.ownerField > (no filter).
    // resolveAllowedIds вызывается per-entity, потому что scope может отличаться
    // по statusAllowed/statusField (Portfolio/Goal требуют status=active, User — нет).
    let owned;
    const scope = scopes[entityName];
    const isOwnerRole = role.base === "owner" || role.base === "admin";
    if (scope && scope.via) {
      const allowedIds = resolveAllowedIds(rawWorld, scope, viewer);
      const localField = scope.localField || entityDef.ownerField;
      if (!localField) {
        // Декларация нечитаема — защитно возвращаем пустой набор.
        owned = [];
      } else {
        owned = rows.filter(r => allowedIds.has(r[localField]));
      }
    } else if (entityDef.kind === "reference") {
      // Reference-data: shared справочник (Asset, Category, Currency...).
      // ownership не применяется — все видят все строки. Role.visibleFields
      // всё равно контролирует какие поля выдавать. §26.5 закрытие.
      owned = rows;
    } else if (isInheritablePermission(entityDef) && !isOwnerRole) {
      // §12.8 Permission inheritance: cascading visibility через parent chain
      // и fallback на root entity. Owner-роли пропускают этот шаг (видят всё).
      const cfg = entityDef.permissionInheritance;
      const viewerId = typeof viewer === "string" ? viewer : viewer?.id;
      owned = rows.filter(r => {
        const lvl = resolveInheritedPermission(r, viewerId, cfg, rawWorld);
        return isPermissionSufficient(lvl, cfg);
      });
    } else {
      const ownerFields = getOwnerFields(entityDef);
      if (ownerFields.length > 0) {
        const viewerId = typeof viewer === "string" ? viewer : viewer?.id;
        owned = rows.filter(r => ownerFields.some(f => r[f] === viewerId));
      } else {
        owned = rows;
      }
    }

    const projected = owned.map(row => {
      const out = {};
      for (const field of allowed) {
        let val = row[field];
        if (field === "status" && statusMapping[val]) {
          val = statusMapping[val];
        }
        if (val !== undefined) out[field] = val;
      }
      return out;
    });

    filtered[outputName] = projected;
  }

  return filtered;
}

export { filterWorldForRole };
