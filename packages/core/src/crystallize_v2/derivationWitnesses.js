/**
 * derivationWitnesses — witness-of-crystallization для правил R1–R8.
 *
 * Отдельный сорт witnesses, дополняющий pattern-bank (v1.12) и
 * alphabetical-fallback (intent-salience PoC):
 *
 *   basis: "crystallize-rule"
 *   reliability: "rule-based"
 *   ruleId: R1..R8
 *   input: агрегаты, которые запустили правило
 *   output: что было выведено (сокращённая форма проекции)
 *   rationale: человекочитаемое объяснение (RU)
 *
 * Спецификация: idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md
 */

/**
 * R1: catalog выведен из creators(E).
 * @param {string} entityName
 * @param {string[]} creators — intent id'ы, создающие E
 */
export function witnessR1Catalog(entityName, creators) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R1",
    input: { entity: entityName, creators: [...creators], count: creators.length },
    output: { kind: "catalog", mainEntity: entityName },
    rationale: `creators(${entityName}) = ${creators.length} → catalog выведен автоматически`,
  };
}

/**
 * R9: composite projection — mainEntity обогащается join'ами через ontology.compositions.
 * Спецификация: idf-manifest-v2.1/docs/design/rule-R9-cross-entity-spec.md
 *
 * @param {string} mainEntity
 * @param {Array<{entity: string, as: string, via: string, mode?: "one"|"many"}>} joins
 * @param {string} projectionId
 */
export function witnessR9Composite(mainEntity, joins, projectionId) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R9",
    input: {
      mainEntity,
      joins: joins.map(j => ({ entity: j.entity, as: j.as, via: j.via, mode: j.mode || "one" })),
      source: "compositions",
      projectionId,
    },
    output: {
      compositions: joins.map(j => ({
        entity: j.entity,
        as: j.as,
        via: j.via,
        mode: j.mode || "one",
      })),
      entities: [mainEntity, ...new Set(joins.map(j => j.entity))],
    },
    rationale: `ontology.compositions.${mainEntity}: ${joins.length} join'${joins.length === 1 ? "" : "ов"} (${joins.map(j => `${j.entity} as ${j.as}`).join(", ")}) → проекция ${projectionId} обогащена composition-aliases`,
  };
}

/**
 * R10: scoped catalog выведен из role.scope (m2m-via через assignment).
 * Спецификация: idf-manifest-v2.1/docs/design/rule-R10-role-scope-spec.md
 *
 * @param {string} roleName
 * @param {string} entityName — сущность, на которую есть scope
 * @param {object} scope — { via, viewerField, joinField, localField, statusField?, statusAllowed? }
 */
export function witnessR10RoleScope(roleName, entityName, scope) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R10",
    input: {
      role: roleName,
      entity: entityName,
      scope: { ...scope },
    },
    output: {
      kind: "catalog",
      mainEntity: entityName,
      readonly: true,
      filter: {
        kind: "m2m-via",
        via: scope.via,
        viewerField: scope.viewerField,
        joinField: scope.joinField,
        localField: scope.localField,
        statusField: scope.statusField || null,
        statusAllowed: scope.statusAllowed || null,
      },
    },
    rationale: `role "${roleName}".scope.${entityName} через ${scope.via}.${scope.joinField} → ${entityName}.${scope.localField} → scoped catalog`,
  };
}

/**
 * R1b: read-only catalog выведен для entity без creators, но referenced.
 * Спецификация: idf-manifest-v2.1/docs/design/rule-R1b-read-only-catalog-spec.md
 *
 * @param {string} entityName
 * @param {string} source — "kind:reference" | "referenced-by"
 * @param {string[]} referencedBy — список "Entity.field" откуда приходят FK
 */
export function witnessR1bReadOnlyCatalog(entityName, source, referencedBy) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R1b",
    input: {
      entity: entityName,
      creators: [],
      source,
      referencedBy: [...referencedBy],
    },
    output: {
      kind: "catalog",
      mainEntity: entityName,
      readonly: true,
    },
    rationale: source === "kind:reference"
      ? `${entityName}.kind === "reference" + creators = ∅ → read-only catalog`
      : `${entityName} referenced в ${referencedBy.join(", ")} + creators = ∅ → read-only catalog`,
  };
}

/**
 * R2: catalog → feed override (confirmation:"enter" + foreignKey к parent).
 * Дополняет R1-witness, не заменяет: автор видит, что сначала catalog был выведен,
 * потом R2 переопределил kind.
 */
export function witnessR2FeedOverride(entityName, feedSignals, parentFk) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R2",
    input: {
      entity: entityName,
      feedSignals: [...feedSignals],
      foreignKey: parentFk.field,
      references: parentFk.references,
    },
    output: { kind: "feed", mainEntity: entityName, idParam: parentFk.field },
    rationale: `creates + confirmation:"enter" + foreignKey ${parentFk.field} → ${parentFk.references} → catalog переопределён в feed`,
  };
}

/**
 * R3: detail выведен из |mutators(E)| > 1.
 */
export function witnessR3Detail(entityName, mutators) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R3",
    input: { entity: entityName, mutators: [...mutators], count: mutators.length },
    output: { kind: "detail", mainEntity: entityName },
    rationale: `|mutators(${entityName})| = ${mutators.length} > 1 → detail выведен автоматически`,
  };
}

/**
 * R3b: owner-scoped singleton detail. my_<entity>_detail без idParam
 * с owner-фильтром. Применяется когда entity.singleton === true И
 * ownerField (single string).
 * Spec: idf-manifest-v2.1/docs/design/rule-R3b-singleton-detail-spec.md
 *
 * @param {string} entityName
 * @param {string} ownerField
 * @param {string[]} mutators
 * @param {string} sourceDetailId
 */
export function witnessR3bSingletonDetail(entityName, ownerField, mutators, sourceDetailId) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R3b",
    input: {
      entity: entityName,
      ownerField,
      mutators: [...mutators],
      sourceDetail: sourceDetailId,
      singleton: true,
    },
    output: {
      kind: "detail",
      mainEntity: entityName,
      filter: { field: ownerField, op: "=", value: "me.id" },
      singleton: true,
    },
    rationale: `${entityName}.singleton === true + ownerField = "${ownerField}" + detail(${sourceDetailId}) существует → my_*_detail singleton (без idParam, с owner-фильтром) добавлен`,
  };
}

/**
 * R7: my_*_list выведен из ownerField.
 * v2.1: base precondition расширен — R1 catalog или R3 detail.
 * `sourceCatalog` сохранён в input для backward compat; фактически содержит id
 * base projection'а (catalog preferred, detail fallback).
 */
export function witnessR7OwnerFilter(entityName, ownerField, sourceBaseId) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R7",
    input: {
      entity: entityName,
      ownerField,
      sourceCatalog: sourceBaseId,
      sourceBase: sourceBaseId,
    },
    output: {
      kind: "catalog",
      mainEntity: entityName,
      filter: { field: ownerField, op: "=", value: "me.id" },
    },
    rationale: `${entityName}.ownerField = "${ownerField}" + base(${sourceBaseId}) существует → my_* catalog с фильтром добавлен`,
  };
}

/**
 * R7b: my_*_list с disjunction-фильтром через multi-ownerField.
 * Применяется когда entity имеет ≥2 owner-field'а (e.g. Deal.customerId + executorId).
 * Спецификация: idf-manifest-v2.1/docs/design/rule-R7b-multi-owner-spec.md
 *
 * @param {string} entityName
 * @param {string[]} ownerFields — массив owner-полей (≥2 элементов)
 * @param {string} sourceCatalogId
 */
export function witnessR7bMultiOwnerFilter(entityName, ownerFields, sourceBaseId) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R7b",
    input: {
      entity: entityName,
      ownerFields: [...ownerFields],
      count: ownerFields.length,
      sourceCatalog: sourceBaseId,
      sourceBase: sourceBaseId,
    },
    output: {
      kind: "catalog",
      mainEntity: entityName,
      filter: {
        kind: "disjunction",
        fields: [...ownerFields],
        op: "=",
        value: "me.id",
      },
    },
    rationale: `${entityName}.ownerField = [${ownerFields.join(", ")}] (${ownerFields.length} owner-fields) + base(${sourceBaseId}) существует → my_* catalog с OR-filter ${ownerFields.map(f => `${f}===me.id`).join(" OR ")}`,
  };
}

/**
 * R4: subCollection добавлен в detail(parent) из foreignKey child → parent.
 * Witness лежит на parent-detail, одна запись на каждый FK.
 */
export function witnessR4SubCollection(parentEntity, childEntity, foreignKey, parentProjectionId, collectionName, addable) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R4",
    input: {
      parentEntity,
      childEntity,
      foreignKey,
      parentProjection: parentProjectionId,
    },
    output: {
      subCollection: collectionName,
      entity: childEntity,
      foreignKey,
      addable,
    },
    rationale: `foreignKey ${childEntity}.${foreignKey} → ${parentEntity} + detail(${parentEntity}) → subCollection "${collectionName}" добавлен в ${parentProjectionId}`,
  };
}

/**
 * R6: field witnesses собраны union'ом из intent.particles.witnesses.
 * Только если итоговый список непустой — иначе R6 «не сработал».
 */
export function witnessR6FieldUnion(entityName, fields, contributingIntents) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R6",
    input: {
      entity: entityName,
      contributingIntents: [...contributingIntents],
      intentCount: contributingIntents.length,
    },
    output: {
      witnesses: [...fields],
      count: fields.length,
    },
    rationale: `union(intent.particles.witnesses) по ${contributingIntents.length} intent'ам → ${fields.length} field-witness(es)`,
  };
}

/**
 * R8: Hub-absorption — parent side.
 * Witness лежит на hub-detail, одна запись на абсорбцию всех children.
 */
export function witnessR8HubAbsorption(parentDetailId, parentEntity, absorbedChildren, threshold) {
  const childIds = absorbedChildren.map(c => c.projectionId);
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R8",
    input: {
      parentDetail: parentDetailId,
      parentEntity,
      absorbedChildren: childIds,
      childCount: childIds.length,
      threshold,
    },
    output: {
      hubSections: absorbedChildren.map(c => ({
        projectionId: c.projectionId,
        foreignKey: c.foreignKey,
        entity: c.entity,
      })),
    },
    rationale: `detail(${parentEntity}) имеет ${childIds.length} ≥ ${threshold} child-каталогов с FK → absorbed в hub-sections`,
  };
}

/**
 * R8: Hub-absorption — child side.
 * Witness лежит на absorbed child-каталоге.
 */
export function witnessR8Absorbed(childCatalogId, parentDetailId, foreignKey) {
  return {
    basis: "crystallize-rule",
    reliability: "rule-based",
    ruleId: "R8",
    input: {
      childCatalog: childCatalogId,
      parentDetail: parentDetailId,
      foreignKey,
    },
    output: {
      absorbedBy: parentDetailId,
    },
    rationale: `catalog ${childCatalogId} absorbed в ${parentDetailId} через FK ${foreignKey}`,
  };
}
