/**
 * R8: Hub absorption — child-каталоги с FK на entity, имеющую detail,
 * становятся sub-sections внутри hub-detail, а не отдельными root-табами.
 *
 * Threshold 2+ child'ов — меньше не оправдывает иерархии.
 *
 * Best-parent heuristic (G-K-11, 2026-04-23): если child имеет FK на
 * нескольких parent'ов (типично для synthetic path-FK из OpenAPI-импортов,
 * например User.roleId + User.realmId), absorption идёт к «hubbier» parent'у
 * — с бо́льшим числом children-candidate'ов. Tiebreak — alphabetical по
 * parentEntity. Без этого правила Role.detail мог бы поглотить User.list
 * только потому, что Role processed earlier в Object.entries.
 */

import { detectForeignKeys } from "./deriveProjections.js";
import { witnessR8HubAbsorption, witnessR8Absorbed } from "./derivationWitnesses.js";

const HUB_MIN_CHILDREN = 2;

/**
 * @param {Record<string, object>} projections
 * @param {object} ontology
 * @returns {Record<string, object>} новый map (вход не мутируется)
 */
export function absorbHubChildren(projections, ontology) {
  const foreignKeys = detectForeignKeys(ontology);
  const result = structuredClone(projections);

  const catalogByEntity = {};
  const detailByEntity = {};
  for (const [id, proj] of Object.entries(result)) {
    if (proj.kind === "catalog" && proj.mainEntity) {
      if (!catalogByEntity[proj.mainEntity]) catalogByEntity[proj.mainEntity] = id;
    } else if (proj.kind === "detail" && proj.mainEntity) {
      detailByEntity[proj.mainEntity] = id;
    }
  }

  // Phase 1 — initial candidates per parent. Parent'ы с <HUB_MIN_CHILDREN
  // отбрасываются сразу и не конкурируют за child'ов.
  const parentCandidates = {};
  for (const [parentEntity, detailId] of Object.entries(detailByEntity)) {
    const candidates = [];
    for (const [childEntity, fks] of Object.entries(foreignKeys)) {
      if (childEntity === parentEntity) continue;
      const fk = fks.find(f => f.references === parentEntity);
      if (!fk) continue;
      const childCatalogId = catalogByEntity[childEntity];
      if (!childCatalogId) continue;
      const childProj = result[childCatalogId];
      if (childProj.absorbed === false) continue;
      candidates.push({ childCatalogId, childEntity, foreignKey: fk.field });
    }
    if (candidates.length >= HUB_MIN_CHILDREN) {
      parentCandidates[parentEntity] = { detailId, candidates };
    }
  }

  // Phase 2 — для каждого child-catalog выбрать best parent. Score = число
  // initial candidates у parent'а. Tiebreak: parentEntity alphabetical.
  const assignmentPerChild = {};
  for (const [parentEntity, { detailId, candidates }] of Object.entries(parentCandidates)) {
    const score = candidates.length;
    for (const c of candidates) {
      const existing = assignmentPerChild[c.childCatalogId];
      if (!existing) {
        assignmentPerChild[c.childCatalogId] = {
          detailId,
          parentEntity,
          foreignKey: c.foreignKey,
          childEntity: c.childEntity,
          score,
        };
        continue;
      }
      if (score > existing.score
          || (score === existing.score && parentEntity < existing.parentEntity)) {
        assignmentPerChild[c.childCatalogId] = {
          detailId,
          parentEntity,
          foreignKey: c.foreignKey,
          childEntity: c.childEntity,
          score,
        };
      }
    }
  }

  // Phase 3 — группируем sections per parent. Parent'ы, потерявшие child'ов
  // при redistribution ниже threshold, отбрасываются (их child'ы остаются
  // root-catalog'ами без absorption — это честнее, чем half-absorbed hub).
  const sectionsPerDetail = {};
  for (const [childCatalogId, a] of Object.entries(assignmentPerChild)) {
    if (!sectionsPerDetail[a.detailId]) sectionsPerDetail[a.detailId] = [];
    sectionsPerDetail[a.detailId].push({
      projectionId: childCatalogId,
      foreignKey: a.foreignKey,
      entity: a.childEntity,
    });
  }
  const viableDetails = new Set(
    Object.entries(sectionsPerDetail)
      .filter(([, sections]) => sections.length >= HUB_MIN_CHILDREN)
      .map(([detailId]) => detailId),
  );

  // Phase 4 — apply absorbedBy + hubSections + witnesses.
  for (const [childCatalogId, a] of Object.entries(assignmentPerChild)) {
    if (!viableDetails.has(a.detailId)) continue;
    const childDerivedBy = [
      ...(result[childCatalogId].derivedBy || []),
      witnessR8Absorbed(childCatalogId, a.detailId, a.foreignKey),
    ];
    result[childCatalogId] = {
      ...result[childCatalogId],
      absorbedBy: a.detailId,
      derivedBy: childDerivedBy,
    };
  }
  for (const [detailId, sections] of Object.entries(sectionsPerDetail)) {
    if (!viableDetails.has(detailId)) continue;
    const parentEntity = Object.entries(detailByEntity)
      .find(([, id]) => id === detailId)?.[0];
    const parentDerivedBy = [
      ...(result[detailId].derivedBy || []),
      witnessR8HubAbsorption(detailId, parentEntity, sections, HUB_MIN_CHILDREN),
    ];
    result[detailId] = {
      ...result[detailId],
      hubSections: sections,
      derivedBy: parentDerivedBy,
    };
  }

  return result;
}
