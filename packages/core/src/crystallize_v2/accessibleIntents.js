/**
 * accessibleIntents — single source of truth для «какие intent'ы доступны
 * в проекции для роли». Используется IB-фильтром (Phase 1) и
 * R0→R1 conservation property-test'ом (Phase 3).
 */

// Формат entities: "alias: EntityType[]" или "EntityType" → берём последнюю часть после ":"
const stripRole = (entityRef) =>
  String(entityRef).split(":").pop().trim().replace(/\[\]$/, "");

/**
 * Проверяет, касается ли intent указанной сущности (по particles.entities,
 * intent.creates или targets в effects).
 */
export function intentTouchesEntity(intent, entityName) {
  const particles = intent?.particles || {};
  const entities = (particles.entities || []).map(stripRole);
  if (entities.includes(entityName)) return true;
  if (intent.creates === entityName) return true;
  const targets = (particles.effects || []).map(
    (e) => stripRole(String(e.target || "").split(".")[0])
  );
  return targets.includes(entityName);
}

/**
 * Возвращает список intent'ов, доступных из проекции для роли.
 *
 * @param {object} projection - проекция с mainEntity
 * @param {string} role - имя роли
 * @param {object} INTENTS - словарь intent'ов
 * @param {object} ONTOLOGY - онтология с roles и entities
 * @returns {{ id: string, ...intent }[]}
 */
export function accessibleIntents(projection, role, INTENTS, ONTOLOGY) {
  const mainEntity = projection?.mainEntity;
  if (!mainEntity) return [];
  const roleDef = ONTOLOGY?.roles?.[role] || {};
  const allowList = Array.isArray(roleDef.canExecute)
    ? new Set(roleDef.canExecute)
    : null;

  const out = [];
  for (const [id, intent] of Object.entries(INTENTS || {})) {
    if (allowList && !allowList.has(id)) continue;
    if (!intentTouchesEntity(intent, mainEntity)) continue;
    out.push({ id, ...intent });
  }
  return out;
}
