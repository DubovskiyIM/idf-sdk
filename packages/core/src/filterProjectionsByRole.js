/**
 * filterProjectionsByRole — role-aware projection filtering для ROOT-нав
 * (backlog §4.9).
 *
 * Projection author декларирует `projection.forRoles: ["customer", "executor"]`
 * — проекция видима только viewer'ам с указанной активной ролью. Без forRoles
 * — видима всем (backward-compat).
 *
 * Примеры:
 *   projection.my_tasks = { kind: "catalog", ..., forRoles: ["customer"] }
 *   projection.my_responses = { kind: "catalog", ..., forRoles: ["executor"] }
 *   projection.my_deals = { kind: "catalog", ... }  // для обеих ролей
 *
 * Семантика — declarative visibility над activeRole (session-scoped),
 * не над role.base (permission-scoped). Role.base фильтрует что viewer
 * может делать; forRoles фильтрует что viewer сейчас видит в nav.
 */

export function isProjectionAvailableForRole(projection, activeRole) {
  if (!projection || typeof projection !== "object") return false;
  const forRoles = projection.forRoles;
  if (!Array.isArray(forRoles) || forRoles.length === 0) return true;
  if (!activeRole) return false;
  return forRoles.includes(activeRole);
}

/**
 * Filter list of projection ids by activeRole.
 * @param {string[]} projectionIds — список id (обычно ROOT_PROJECTIONS)
 * @param {object} projections — map { [id]: projection }
 * @param {string|null} activeRole — текущая активная роль viewer'а
 * @returns {string[]} filtered list (preserves input order)
 */
export function filterProjectionsByRole(projectionIds, projections, activeRole) {
  if (!Array.isArray(projectionIds)) return [];
  if (!projections || typeof projections !== "object") return projectionIds;
  return projectionIds.filter(id => {
    const p = projections[id];
    return isProjectionAvailableForRole(p, activeRole);
  });
}

/**
 * Partition projection ids into visible / hidden groups для Studio/inspector
 * display. Useful для debugging «куда делась проекция при смене роли».
 */
export function partitionProjectionsByRole(projectionIds, projections, activeRole) {
  const visible = [];
  const hidden = [];
  for (const id of projectionIds) {
    const p = projections?.[id];
    if (isProjectionAvailableForRole(p, activeRole)) {
      visible.push(id);
    } else {
      hidden.push({ id, forRoles: p?.forRoles || [] });
    }
  }
  return { visible, hidden };
}
