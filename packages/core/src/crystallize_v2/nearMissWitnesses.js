/**
 * nearMissWitnesses — «отрицательные» witness'ы: где R-правило *могло*
 * сработать, но не сработало, с actionable rationale.
 *
 * В отличие от positive witness'ов (`basis: "crystallize-rule"`), которые
 * лежат на проекциях, near-miss лежат на уровне (entity, rule) и не
 * привязаны к какой-либо проекции — соответствующей проекции не существует.
 *
 * Consumer — CrystallizeInspector (§27), uncovered-classification (idf/),
 * авторский tooling для «почему у Category нет detail».
 *
 * Basis: "crystallize-rule-near-miss"
 *
 * Спецификация: idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md
 *
 * @module crystallize_v2/nearMissWitnesses
 */

import { analyzeIntents, detectForeignKeys } from "./deriveProjections.js";

const EXCLUDED_ENTITY_KINDS = new Set(["assignment"]);

/**
 * Сбор всех near-miss witness'ов из (intents, ontology).
 * @param {Record<string, object>} intents
 * @param {object} ontology
 * @returns {Array<{
 *   basis: "crystallize-rule-near-miss",
 *   reliability: "rule-based",
 *   ruleId: string,
 *   entity?: string,
 *   role?: string,
 *   reason: string,
 *   actual: object,
 *   expected: string,
 *   rationale: string,
 *   suggestion: string,
 * }>}
 */
export function collectNearMissWitnesses(intents, ontology) {
  const entities = ontology?.entities || {};
  const entityNames = Object.keys(entities);
  const analysis = analyzeIntents(intents || {}, entityNames);
  const foreignKeys = detectForeignKeys(ontology || {});
  const results = [];

  for (const entityName of entityNames) {
    const entityDef = entities[entityName] || {};
    if (EXCLUDED_ENTITY_KINDS.has(entityDef.kind)) continue;

    const creatorCount = (analysis.creators[entityName] || []).length;
    const mutatorCount = (analysis.mutators[entityName] || []).length;

    // R3 near-miss: exactly 1 mutator — порог R3 = >1
    if (mutatorCount === 1) {
      const mutatorId = analysis.mutators[entityName][0];
      results.push({
        basis: "crystallize-rule-near-miss",
        reliability: "rule-based",
        ruleId: "R3",
        entity: entityName,
        reason: "mutator-count-below-threshold",
        actual: { mutatorCount: 1, mutator: mutatorId, threshold: ">1" },
        expected: "|mutators(E)| > 1",
        rationale: `|mutators(${entityName})| = 1 (${mutatorId}); R3 требует >1 → detail не выведен.`,
        suggestion: `Добавьте ещё один intent с effect.target = "${entityName.toLowerCase()}.<field>" или объявите projection.${entityName.toLowerCase()}_detail явно.`,
      });
    }

    // R1b near-miss: creators пуст, не kind:"reference", не referenced by FK
    if (creatorCount === 0 && entityDef.kind !== "reference") {
      const isReferenced = Object.values(foreignKeys).some(fks =>
        fks.some(fk => fk.references === entityName)
      );
      if (!isReferenced) {
        results.push({
          basis: "crystallize-rule-near-miss",
          reliability: "rule-based",
          ruleId: "R1b",
          entity: entityName,
          reason: "isolated-entity",
          actual: { creators: 0, kind: entityDef.kind || null, referencedBy: [] },
          expected: `creators(E) > 0 OR kind === "reference" OR referenced via entityRef`,
          rationale: `${entityName} не имеет creator-intent'ов, не помечена kind:"reference", и на неё не ссылаются FK-поля → R1/R1b не сработали.`,
          suggestion: `Проверьте, нужна ли сущность ${entityName}. Если это справочник — добавьте kind:"reference". Если planned для будущего — удалите из ontology.`,
        });
      }
    }

    // R7 near-miss: R1 сработал (есть catalog), но ownerField не объявлен —
    // не сможем получить my_*_list. Часто это пробел в домене.
    if (creatorCount > 0 && !entityDef.ownerField) {
      // Но если нет `userId`-подобного поля — скорее всего намеренно
      const hasOwnerCandidate = entityDef.fields && !Array.isArray(entityDef.fields) &&
        Object.keys(entityDef.fields).some(f => f === "userId" || f === "ownerId" || f === "authorId" || f === "creatorId");
      if (hasOwnerCandidate) {
        results.push({
          basis: "crystallize-rule-near-miss",
          reliability: "rule-based",
          ruleId: "R7",
          entity: entityName,
          reason: "owner-candidate-without-ownerField",
          actual: { creators: creatorCount, ownerField: null },
          expected: `entity.ownerField declared`,
          rationale: `${entityName} имеет creator-intent'ы и owner-candidate поле, но ontology.entities.${entityName}.ownerField не объявлен → my_*_list не выведен.`,
          suggestion: `Добавьте ownerField: "userId" (или соответствующий candidate) в ontology.entities.${entityName}.`,
        });
      }
    }
  }

  // R10 near-miss: роль объявлена, но без scope
  const roles = ontology?.roles || {};
  for (const [roleName, roleDef] of Object.entries(roles)) {
    if (!roleDef || typeof roleDef !== "object") continue;
    if (roleDef.scope && typeof roleDef.scope === "object" && Object.keys(roleDef.scope).length > 0) continue;
    // Не near-miss для baseline roles — только для тех, где intuitively ждём scope.
    if (roleDef.base === "agent" || roleDef.base === "observer") {
      results.push({
        basis: "crystallize-rule-near-miss",
        reliability: "rule-based",
        ruleId: "R10",
        role: roleName,
        reason: "role-without-scope",
        actual: { base: roleDef.base, scope: null },
        expected: `role.scope declared for agent/observer roles`,
        rationale: `Роль "${roleName}" (base:"${roleDef.base}") не имеет scope-декларации → R10 не сработал, scoped catalog'и не выведены.`,
        suggestion: `Добавьте ontology.roles.${roleName}.scope = { <Entity>: { via, viewerField, joinField, localField } } для видимости through-assignment.`,
      });
    }
  }

  return results;
}

/**
 * Группировка near-miss по ruleId для удобного render'а.
 */
export function groupNearMissByRule(nearMisses) {
  const out = {};
  for (const nm of nearMisses || []) {
    const k = nm.ruleId || "unknown";
    if (!out[k]) out[k] = [];
    out[k].push(nm);
  }
  return out;
}
