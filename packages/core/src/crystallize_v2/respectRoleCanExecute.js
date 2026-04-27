/**
 * respectRoleCanExecute — Phase 3d.1/3d.2 helper.
 *
 * Phase 3d filter alignment research показал, что 89.3% всех `derivedOnly`
 * mismatches между existing assignToSlots* и computeAlternateAssignment —
 * это `role-canExecute-restriction`. Existing assignToSlots* показывает
 * intents даже если active role не имеет их в `ONTOLOGY.roles[role].canExecute`
 * whitelist (show-but-fail UX anti-pattern).
 *
 * Этот модуль — opt-in helper для assignToSlotsCatalog/Detail:
 *
 *   filterIntentsByRoleCanExecute(INTENTS, role, ONTOLOGY)
 *     — возвращает subset INTENTS прошедших canExecute filter.
 *
 *   detectCanExecuteViolations(INTENTS, role, ONTOLOGY)
 *     — возвращает массив intent ids которые **были бы** отфильтрованы.
 *       Используется для witness emission когда opts.respectRoleCanExecute
 *       === false (default), но опт-ин diagnose активен.
 *
 * Phasing:
 *   3d.1 (этот PR): opts.respectRoleCanExecute opt-in
 *   3d.2 (этот PR): witness emission для violations
 *   3d.3 (long-term major): default true
 *
 * Backlog: idf-sdk § A2 Phase 3d.
 * Decision: idf docs/jointsolver-filter-alignment-decision-2026-04-27.md
 */

/**
 * Получить canExecute whitelist для role (если defined).
 * @returns {Set<string> | null} — null если role не определена либо
 *   canExecute не array (== не filter'им).
 */
function getCanExecuteSet(role, ONTOLOGY) {
  if (!role) return null;
  const roleDef = ONTOLOGY?.roles?.[role];
  if (!roleDef) return null;
  if (!Array.isArray(roleDef.canExecute)) return null;
  return new Set(roleDef.canExecute);
}

/**
 * Filter INTENTS, оставляя только те, что проходят role.canExecute check.
 *
 * Если role не определена в ontology, либо canExecute не array — INTENTS
 * возвращается as-is (no-op).
 *
 * Также respect'ит `intent.permittedFor` (если задан) — только intents
 * где role в permittedFor.
 *
 * @param {Record<string, Object>} INTENTS
 * @param {string} role
 * @param {Object} ONTOLOGY
 * @returns {Record<string, Object>}
 */
export function filterIntentsByRoleCanExecute(INTENTS, role, ONTOLOGY) {
  const allowed = getCanExecuteSet(role, ONTOLOGY);
  if (!allowed) return INTENTS;

  const filtered = {};
  for (const [id, intent] of Object.entries(INTENTS)) {
    if (!allowed.has(id)) continue;

    // permittedFor — secondary check
    if (Array.isArray(intent?.permittedFor) && intent.permittedFor.length > 0) {
      if (!intent.permittedFor.includes(role)) continue;
    }

    filtered[id] = intent;
  }
  return filtered;
}

/**
 * Детектировать intents которые были бы отфильтрованы canExecute check.
 *
 * Возвращает массив `{ intentId, reason }` где reason — `"canExecute"`,
 * `"permittedFor"`, или `"both"`. Используется для witness emission.
 *
 * @param {Record<string, Object>} INTENTS
 * @param {string} role
 * @param {Object} ONTOLOGY
 * @returns {Array<{ intentId: string, reason: "canExecute" | "permittedFor" | "both" }>}
 */
export function detectCanExecuteViolations(INTENTS, role, ONTOLOGY) {
  const allowed = getCanExecuteSet(role, ONTOLOGY);
  if (!allowed) return [];

  const violations = [];
  for (const [id, intent] of Object.entries(INTENTS)) {
    const blockedByCanExec = !allowed.has(id);

    let blockedByPermittedFor = false;
    if (Array.isArray(intent?.permittedFor) && intent.permittedFor.length > 0) {
      blockedByPermittedFor = !intent.permittedFor.includes(role);
    }

    if (blockedByCanExec && blockedByPermittedFor) {
      violations.push({ intentId: id, reason: "both" });
    } else if (blockedByCanExec) {
      violations.push({ intentId: id, reason: "canExecute" });
    } else if (blockedByPermittedFor) {
      violations.push({ intentId: id, reason: "permittedFor" });
    }
  }
  return violations;
}

/**
 * Build witness `role-canExecute-violation` для surface
 * show-but-fail intents в Studio / Inspector.
 *
 * @param {Object} opts
 * @param {string} opts.intentId
 * @param {string} opts.role
 * @param {string} opts.archetype
 * @param {string} opts.projectionId
 * @param {"canExecute" | "permittedFor" | "both"} opts.reason
 * @returns {Object}
 */
export function buildCanExecuteViolationWitness({ intentId, role, archetype, projectionId, reason }) {
  return {
    basis: "role-canExecute-violation",
    reliability: "rule-based",
    intentId,
    role,
    archetype,
    projection: projectionId,
    reason,
    message: reason === "permittedFor"
      ? `Intent ${intentId} shown в derived UI но role ${role} не в intent.permittedFor`
      : reason === "both"
      ? `Intent ${intentId} shown в derived UI но role ${role} не имеет intent в canExecute и не в permittedFor`
      : `Intent ${intentId} shown в derived UI но role ${role} не имеет intent в ONTOLOGY.roles.${role}.canExecute`,
    recommendation: `Если intentional — добавить ${intentId} в ONTOLOGY.roles.${role}.canExecute (или intent.permittedFor). Если bug — рассмотреть opts.respectRoleCanExecute: true.`,
  };
}
