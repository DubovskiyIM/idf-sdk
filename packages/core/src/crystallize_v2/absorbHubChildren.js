/**
 * R8: Hub absorption — child-каталоги с FK на entity, имеющую detail,
 * становятся sub-sections внутри hub-detail, а не отдельными root-табами.
 *
 * Threshold 2+ child'ов — меньше не оправдывает иерархии.
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

    if (candidates.length < HUB_MIN_CHILDREN) continue;

    const sections = [];
    for (const { childCatalogId, childEntity, foreignKey } of candidates) {
      const childDerivedBy = [
        ...(result[childCatalogId].derivedBy || []),
        witnessR8Absorbed(childCatalogId, detailId, foreignKey),
      ];
      result[childCatalogId] = {
        ...result[childCatalogId],
        absorbedBy: detailId,
        derivedBy: childDerivedBy,
      };
      sections.push({ projectionId: childCatalogId, foreignKey, entity: childEntity });
    }
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
