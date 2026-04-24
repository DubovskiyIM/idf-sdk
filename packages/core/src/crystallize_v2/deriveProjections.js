/**
 * deriveProjections — деривация проекций из намерений и онтологии.
 *
 * Принцип максимальной деривации: если структура выводима из намерений,
 * она не является отдельным входом системы.
 *
 * Правила:
 * R1: creators(E) → catalog
 * R2: confirmation:"enter" + foreignKey → feed
 * R3: |mutators(E)| > 1 → detail
 * R4: foreignKey E'→E → subCollection в detail(E)
 * R6: witnesses из пересекающихся intents
 * R7: ownerField → my_* catalog с фильтром
 *
 * Witness trail (basis:"crystallize-rule") — каждое срабатывание R1/R2/R3/R7
 * пишется в proj.derivedBy[] и пробрасывается в artifact.witnesses[]
 * через crystallize_v2/index.js. Спецификация:
 * idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md
 */

import {
  witnessR1Catalog,
  witnessR1bReadOnlyCatalog,
  witnessR2FeedOverride,
  witnessR3Detail,
  witnessR3bSingletonDetail,
  witnessR3cReadOnlyDetail,
  witnessR4SubCollection,
  witnessR6FieldUnion,
  witnessR7OwnerFilter,
  witnessR7bMultiOwnerFilter,
  witnessR9Composite,
  witnessR10RoleScope,
  witnessR11TemporalFeed,
} from "./derivationWitnesses.js";

/**
 * Обратный индекс foreignKeys: для E возвращает ["E'.fk", ...] — кто на неё ссылается.
 */
function buildReferencedByIndex(foreignKeys) {
  const index = {};
  for (const [entityName, fks] of Object.entries(foreignKeys)) {
    for (const fk of fks) {
      const target = fk.references;
      if (!index[target]) index[target] = [];
      index[target].push(`${entityName}.${fk.field}`);
    }
  }
  return index;
}

/**
 * Нормализация creates: "Listing(draft)" → "Listing"
 */
function normalizeCreates(creates) {
  if (!creates) return null;
  return creates.replace(/\(.*\)$/, "");
}

/**
 * Pluralize entity name: Listing → listings, Category → categories
 */
function pluralize(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith("s")) return lower + "es";
  if (lower.endsWith("y")) return lower.slice(0, -1) + "ies";
  return lower + "s";
}

/**
 * Резолвим имя из target эффекта в имя сущности из онтологии.
 * "listing" → "Listing", "listings" → "Listing", "listing.title" base="listing" → "Listing"
 */
function resolveEntityName(base, entityNames) {
  // Точное совпадение (case-insensitive)
  const exact = entityNames.find(e => e.toLowerCase() === base.toLowerCase());
  if (exact) return exact;
  // Plural → singular: "listings" → "Listing"
  const asPlural = entityNames.find(e => pluralize(e) === base.toLowerCase());
  if (asPlural) return asPlural;
  return null;
}

/**
 * Один проход по INTENTS: собирает creators, mutators, feedSignals на каждую сущность.
 * @param {Record<string, object>} intents
 * @param {string[]} [entityNames] — имена сущностей из онтологии (для резолва target)
 */
export function analyzeIntents(intents, entityNames) {
  // Если entityNames не переданы, собираем из creates + entities
  if (!entityNames) {
    const names = new Set();
    for (const intent of Object.values(intents)) {
      const created = normalizeCreates(intent.creates);
      if (created) names.add(created);
      for (const e of intent.particles?.entities || []) {
        const parts = e.split(":");
        const typeName = (parts[1] || parts[0]).trim();
        names.add(typeName);
      }
    }
    entityNames = [...names];
  }

  const creators = {};    // E → [intentId, ...]
  const mutators = {};    // E → [intentId, ...]
  const feedSignals = {}; // E → [intentId, ...]

  for (const [id, intent] of Object.entries(intents)) {
    // creators
    const createdEntity = normalizeCreates(intent.creates);
    if (createdEntity) {
      if (!creators[createdEntity]) creators[createdEntity] = [];
      creators[createdEntity].push(id);
    }

    // mutators — из effects
    if (intent.particles?.effects) {
      for (const eff of intent.particles.effects) {
        if (!eff.target) continue;
        const base = eff.target.split(".")[0];
        const entityName = resolveEntityName(base, entityNames);
        if (!entityName) continue;
        if (!mutators[entityName]) mutators[entityName] = [];
        if (!mutators[entityName].includes(id)) {
          mutators[entityName].push(id);
        }
      }
    }

    // feedSignals — creates + confirmation:"enter"
    if (createdEntity && intent.particles?.confirmation === "enter") {
      if (!feedSignals[createdEntity]) feedSignals[createdEntity] = [];
      feedSignals[createdEntity].push(id);
    }
  }

  return { creators, mutators, feedSignals };
}

/**
 * Детекция foreignKey-полей из онтологии.
 * Приоритет: type:"entityRef" > суффикс Id (fallback для array-формата).
 * @returns {{ [entityName: string]: Array<{field: string, references: string}> }}
 */
export function detectForeignKeys(ontology) {
  const entityNames = Object.keys(ontology.entities || {});
  const result = {};

  for (const [entityName, entityDef] of Object.entries(ontology.entities || {})) {
    const fks = [];
    const fields = entityDef.fields;

    if (fields && !Array.isArray(fields)) {
      // Typed format: { fieldName: { type, ... } }
      for (const [fieldName, fieldDef] of Object.entries(fields)) {
        if (fieldName === "id") continue;
        // Explicit FK-marker от importer'ов: { kind: "foreignKey", references: "Entity" }.
        // OpenAPI-importer кладёт type:"string" + kind:"foreignKey" + references —
        // это приоритетная форма, т.к. referenced entity задана явно, без name-matching.
        if (fieldDef.kind === "foreignKey" && typeof fieldDef.references === "string") {
          const referenced = entityNames.includes(fieldDef.references)
            ? fieldDef.references
            : entityNames.find(e => e.toLowerCase() === fieldDef.references.toLowerCase());
          if (referenced) {
            fks.push({ field: fieldName, references: referenced });
            continue;
          }
        }
        if (fieldDef.type === "entityRef") {
          // Ищем referenced entity: сначала точное совпадение refName→entityName,
          // потом через ownerField-паттерны (bidderId → User через Bid.ownerField)
          const refName = fieldName.replace(/Id$/, "");
          const referenced = entityNames.find(e => e.toLowerCase() === refName.toLowerCase());
          if (referenced) {
            fks.push({ field: fieldName, references: referenced });
          }
        }
      }
    } else if (Array.isArray(fields)) {
      // Array format: ["id", "pollId", "userId"]
      for (const fieldName of fields) {
        if (fieldName === "id") continue;
        if (fieldName.endsWith("Id")) {
          const refName = fieldName.replace(/Id$/, "");
          const referenced = entityNames.find(e => e.toLowerCase() === refName.toLowerCase());
          if (referenced) {
            fks.push({ field: fieldName, references: referenced });
          }
        }
      }
    }

    if (fks.length > 0) result[entityName] = fks;
  }

  return result;
}

/**
 * deriveProjections — главная функция.
 * Выводит проекции из намерений и онтологии по правилам R1-R7.
 * @param {Record<string, object>} intents
 * @param {object} ontology
 * @returns {Record<string, object>} проекции в формате projections.js
 */
/**
 * R6: собрать union witnesses из всех интентов, ссылающихся на данную сущность.
 * Возвращает { fields, contributingIntents } — второе нужно для witness trail.
 */
function collectWitnessesDetailed(entityName, intents) {
  const fields = new Set();
  const contributing = [];

  for (const [intentId, intent] of Object.entries(intents)) {
    const refs = intent.particles?.entities || [];
    const refsEntity = refs.some(e => {
      const parts = e.split(":");
      const typeName = (parts[1] || parts[0]).trim();
      return typeName === entityName;
    });
    const createsEntity = normalizeCreates(intent.creates) === entityName;

    if (refsEntity || createsEntity) {
      const ws = intent.particles?.witnesses || [];
      if (ws.length > 0) contributing.push(intentId);
      for (const w of ws) fields.add(w);
    }
  }

  return { fields: [...fields].sort(), contributingIntents: contributing };
}

function collectWitnesses(entityName, intents) {
  return collectWitnessesDetailed(entityName, intents).fields;
}

export function deriveProjections(intents, ontology) {
  const entityNames = Object.keys(ontology.entities || {});
  const analysis = analyzeIntents(intents, entityNames);
  const foreignKeys = detectForeignKeys(ontology);
  const referencedBy = buildReferencedByIndex(foreignKeys);
  const projections = {};

  for (const entityName of entityNames) {
    const lower = entityName.toLowerCase();
    const entityDef = ontology.entities[entityName] || {};
    const hasCreators = (analysis.creators[entityName] || []).length > 0;
    const mutatorCount = (analysis.mutators[entityName] || []).length;
    const hasFeedSignals = (analysis.feedSignals[entityName] || []).length > 0;

    const { fields: witnesses, contributingIntents } = collectWitnessesDetailed(entityName, intents);
    // R6 witness — union всех field-witness'ов из intent.particles.witnesses.
    // Пишется только если fields.length > 0 (иначе R6 «не сработал»).
    const r6Witness = witnesses.length > 0
      ? witnessR6FieldUnion(entityName, witnesses, contributingIntents)
      : null;

    // R1: Catalog
    if (hasCreators) {
      const creatorIds = analysis.creators[entityName] || [];
      const derivedBy = [witnessR1Catalog(entityName, creatorIds)];
      const proj = {
        kind: "catalog",
        mainEntity: entityName,
        entities: [entityName],
        witnesses,
        derivedBy,
      };

      // R2: Feed override — confirmation:"enter" + foreignKey к parent
      if (hasFeedSignals) {
        const entityFks = foreignKeys[entityName] || [];
        const parentFk = entityFks.find(fk => fk.references !== entityName);
        if (parentFk) {
          proj.kind = "feed";
          proj.idParam = parentFk.field;
          derivedBy.push(witnessR2FeedOverride(entityName, analysis.feedSignals[entityName] || [], parentFk));
        }
      }

      if (r6Witness) derivedBy.push(r6Witness);
      projections[`${lower}_list`] = proj;
    } else {
      // R1b: Read-only catalog — creators = ∅, но entity объявлена в онтологии
      // и либо kind:"reference", либо на неё ссылается foreignKey из другой entity.
      // Исключения: entity.kind === "assignment" (m2m-связка, не имеет своего catalog'а).
      // Спецификация: idf-manifest-v2.1/docs/design/rule-R1b-read-only-catalog-spec.md
      if (entityDef.kind !== "assignment") {
        const isReferenceKind = entityDef.kind === "reference";
        const refList = referencedBy[entityName] || [];
        const isReferenced = refList.length > 0;
        if (isReferenceKind || isReferenced) {
          const source = isReferenceKind ? "kind:reference" : "referenced-by";
          const derivedBy = [witnessR1bReadOnlyCatalog(entityName, source, refList)];
          if (r6Witness) derivedBy.push(r6Witness);
          projections[`${lower}_list`] = {
            kind: "catalog",
            mainEntity: entityName,
            entities: [entityName],
            readonly: true,
            witnesses,
            derivedBy,
          };
        }
      }
    }

    // R3: Detail
    if (mutatorCount > 1) {
      const mutatorIds = analysis.mutators[entityName] || [];
      const detailDerivedBy = [witnessR3Detail(entityName, mutatorIds)];
      if (r6Witness) detailDerivedBy.push(r6Witness);
      projections[`${lower}_detail`] = {
        kind: "detail",
        mainEntity: entityName,
        entities: [entityName],
        // backlog §9.2: detail needs explicit idParam, иначе
        // ArchetypeDetail не резолвит target из routeParams. Convention:
        // <entityLower>Id.
        idParam: `${lower}Id`,
        witnesses,
        derivedBy: detailDerivedBy,
      };
    } else if (projections[`${lower}_list`]) {
      // R3c: Read-only detail — catalog существует (R1 или R1b), но
      // mutators нет. Без detail-проекции row-click в catalog'е некуда
      // не ведёт (navGraph не строит item-click edge). Кейс: read-only
      // роль (customer видит list_book, но update/delete — только staff;
      // host filter'ит INTENTS по role.canExecute ДО crystallize). Detail
      // генерируется с `readonly: true`, renderer скрывает CTA-toolbar.
      const catalog = projections[`${lower}_list`];
      const source = catalog.readonly ? "R1b-readonly-catalog" : "R1-catalog-no-mutators";
      const detailDerivedBy = [witnessR3cReadOnlyDetail(entityName, source)];
      if (r6Witness) detailDerivedBy.push(r6Witness);
      projections[`${lower}_detail`] = {
        kind: "detail",
        mainEntity: entityName,
        entities: [entityName],
        readonly: true,
        idParam: `${lower}Id`,
        witnesses,
        derivedBy: detailDerivedBy,
      };
    }
  }

  // R4: SubCollections — для каждого detail, добавить sub-entities по foreignKey
  for (const [entityName, fks] of Object.entries(foreignKeys)) {
    for (const fk of fks) {
      const parentLower = fk.references.toLowerCase();
      const parentDetailId = `${parentLower}_detail`;
      const parentDetail = projections[parentDetailId];
      if (!parentDetail) continue;

      if (!parentDetail.subCollections) parentDetail.subCollections = [];
      const hasCreatorsForSub = (analysis.creators[entityName] || []).length > 0;
      const collectionName = pluralize(entityName);
      parentDetail.subCollections.push({
        collection: collectionName,
        entity: entityName,
        foreignKey: fk.field,
        addable: hasCreatorsForSub,
      });
      if (!parentDetail.derivedBy) parentDetail.derivedBy = [];
      parentDetail.derivedBy.push(
        witnessR4SubCollection(fk.references, entityName, fk.field, parentDetailId, collectionName, hasCreatorsForSub)
      );
    }
  }

  // R7 / R7b: Owner-filtered catalog
  // ownerField может быть строкой (R7 — single owner) или массивом (R7b —
  // multi-owner disjunction).
  //
  // Precondition (v2.1 relaxed): base projection существует — либо R1 catalog,
  // либо R3 detail. Side-effect-created entities (Deal через accept_response и
  // подобные, у которых нет `creates:E` intent'а) теперь тоже получают
  // my_*_list. Witnesses наследуются от имеющегося base (catalog preferred).
  //
  // Spec:
  //   R7  — idf-manifest-v2.1/docs/design/debugging-derived-ui-spec.md
  //   R7b — idf-manifest-v2.1/docs/design/rule-R7b-multi-owner-spec.md
  for (const entityName of entityNames) {
    const lower = entityName.toLowerCase();
    const entityDef = ontology.entities[entityName];
    // Preference к entityDef.owners (multi-owner, backlog 3.2 API);
    // fallback к entityDef.ownerField (legacy single или массив). Оба
    // синтаксически совместимы: string | string[]. Author может писать
    // либо одно, либо оба одновременно (одинаковый value); дубликация
    // не требуется.
    const ownerField = entityDef?.owners ?? entityDef?.ownerField;
    if (!ownerField) continue;

    const catalogId = `${lower}_list`;
    const detailId = `${lower}_detail`;
    const baseProj = projections[catalogId] || projections[detailId];
    if (!baseProj) continue;

    const baseWitnesses = baseProj.witnesses || [];
    const baseSourceId = projections[catalogId] ? catalogId : detailId;

    if (Array.isArray(ownerField) && ownerField.length >= 2) {
      // R7b: disjunction filter
      projections[`my_${lower}_list`] = {
        kind: "catalog",
        mainEntity: entityName,
        entities: [entityName],
        witnesses: baseWitnesses,
        filter: {
          kind: "disjunction",
          fields: [...ownerField],
          op: "=",
          value: "me.id",
        },
        derivedBy: [witnessR7bMultiOwnerFilter(entityName, ownerField, baseSourceId)],
      };
    } else if (typeof ownerField === "string") {
      // R7: single owner
      projections[`my_${lower}_list`] = {
        kind: "catalog",
        mainEntity: entityName,
        entities: [entityName],
        witnesses: baseWitnesses,
        filter: { field: ownerField, op: "=", value: "me.id" },
        derivedBy: [witnessR7OwnerFilter(entityName, ownerField, baseSourceId)],
      };
    }
  }

  // R3b: Singleton owner-scoped detail — для entity с entity.singleton:true + string ownerField.
  // Применяется к сущностям типа Wallet, RiskProfile, UserSettings — по одной записи на owner.
  // Генерирует my_<entity>_detail (в дополнение к <entity>_detail из R3), без idParam,
  // с owner-фильтром. Spec: idf-manifest-v2.1/docs/design/rule-R3b-singleton-detail-spec.md
  for (const entityName of entityNames) {
    const lower = entityName.toLowerCase();
    const entityDef = ontology.entities[entityName];
    if (!entityDef?.singleton) continue;
    // Preference к owners (backlog 3.2), fallback к ownerField (legacy).
    const ownerField = entityDef.owners ?? entityDef.ownerField;
    if (typeof ownerField !== "string") continue;  // R3b требует single ownerField
    const detailId = `${lower}_detail`;
    if (!projections[detailId]) continue;  // R3 должен был вывести base detail
    // Skip если base detail — read-only (R3c, без mutator'ов). R3b singleton
    // генерирует my_*_detail как owner-scoped edit surface — без mutator'ов
    // бессмыслен.
    if (projections[detailId].readonly) continue;
    const mutatorIds = analysis.mutators[entityName] || [];
    projections[`my_${lower}_detail`] = {
      kind: "detail",
      mainEntity: entityName,
      entities: [entityName],
      witnesses: projections[detailId].witnesses,
      filter: { field: ownerField, op: "=", value: "me.id" },
      singleton: true,
      derivedBy: [witnessR3bSingletonDetail(entityName, ownerField, mutatorIds, detailId)],
    };
  }

  // R11: Temporal feed — entity.temporal:true → <entity>_feed с временной
  // сортировкой. Применяется к event-like сущностям (Insight, Notification,
  // Activity) — монотонно растущие append-only потоки.
  //
  // v2 (owner-scoped): если entity также имеет ownerField (string), генерируется
  // ДОПОЛНИТЕЛЬНО my_<entity>_feed с owner-фильтром + тем же sort. Аналог
  // отношения R1→R7 для временных лент.
  //
  // Spec: idf-manifest-v2.1/docs/design/rule-R11-temporal-feed-spec.md
  for (const entityName of entityNames) {
    const entityDef = ontology.entities[entityName];
    if (!entityDef?.temporal) continue;
    const lower = entityName.toLowerCase();
    const catalogId = `${lower}_list`;
    const detailId = `${lower}_detail`;
    const baseProj = projections[catalogId] || projections[detailId];
    if (!baseProj) continue;

    const timestampField = entityDef.timestampField || "createdAt";
    const baseSourceId = projections[catalogId] ? catalogId : detailId;

    // Public temporal feed
    projections[`${lower}_feed`] = {
      kind: "feed",
      mainEntity: entityName,
      entities: [entityName],
      witnesses: baseProj.witnesses || [],
      sort: `-${timestampField}`,
      derivedBy: [witnessR11TemporalFeed(entityName, timestampField, baseSourceId)],
    };

    // Owner-scoped temporal feed (R11 v2): entity.temporal + ownerField.
    // Single-string owner только (disjunction-feed — future R11b если потребуется).
    const ownerField = entityDef.ownerField;
    if (typeof ownerField === "string") {
      projections[`my_${lower}_feed`] = {
        kind: "feed",
        mainEntity: entityName,
        entities: [entityName],
        witnesses: baseProj.witnesses || [],
        filter: { field: ownerField, op: "=", value: "me.id" },
        sort: `-${timestampField}`,
        derivedBy: [witnessR11TemporalFeed(entityName, timestampField, baseSourceId, { ownerField })],
      };
    }
  }

  // R10: Role-scope filtered catalog — для каждой роли с scope-объявлением,
  // каждой сущности в scope — генерируется scoped_<role>_<entity>_list.
  // Формат scope (реальный, из invest): { via, viewerField, joinField, localField, statusField?, statusAllowed? }
  // Спецификация: idf-manifest-v2.1/docs/design/rule-R10-role-scope-spec.md
  const roles = ontology.roles || {};
  for (const [roleName, roleDef] of Object.entries(roles)) {
    const scope = roleDef?.scope;
    if (!scope || typeof scope !== "object") continue;
    for (const [scopedEntityName, scopeSpec] of Object.entries(scope)) {
      if (!scopeSpec || typeof scopeSpec !== "object") continue;
      if (!scopeSpec.via || !scopeSpec.viewerField || !scopeSpec.joinField || !scopeSpec.localField) {
        continue;  // неполный scope-spec — игнорируем
      }
      const scopedEntityLower = scopedEntityName.toLowerCase();
      const scopedProjId = `${roleName}_${scopedEntityLower}_list`;
      const witnessSrc = collectWitnessesDetailed(scopedEntityName, intents);
      projections[scopedProjId] = {
        kind: "catalog",
        mainEntity: scopedEntityName,
        entities: [scopedEntityName],
        readonly: true,
        witnesses: witnessSrc.fields,
        filter: {
          kind: "m2m-via",
          via: scopeSpec.via,
          viewerField: scopeSpec.viewerField,
          joinField: scopeSpec.joinField,
          localField: scopeSpec.localField,
          statusField: scopeSpec.statusField || null,
          statusAllowed: scopeSpec.statusAllowed || null,
        },
        derivedBy: [witnessR10RoleScope(roleName, scopedEntityName, scopeSpec)],
      };
    }
  }

  // R9: Cross-entity composite — обогащение существующих проекций
  // ontology.compositions[mainEntity] = [{ entity, as, via, mode? }] →
  // добавляем compositions + расширяем entities для всех проекций с этим mainEntity.
  // Спецификация: idf-manifest-v2.1/docs/design/rule-R9-cross-entity-spec.md
  const compositions = ontology.compositions || {};
  for (const [projId, proj] of Object.entries(projections)) {
    const compSpec = compositions[proj.mainEntity];
    if (!Array.isArray(compSpec) || compSpec.length === 0) continue;
    // validate entries
    const joins = compSpec.filter(c => c && c.entity && c.as && c.via);
    if (joins.length === 0) continue;
    proj.compositions = joins.map(j => ({
      entity: j.entity,
      as: j.as,
      via: j.via,
      mode: j.mode || "one",
    }));
    // расширяем entities set'ом целевых сущностей
    const entitySet = new Set(proj.entities || [proj.mainEntity]);
    for (const j of joins) entitySet.add(j.entity);
    proj.entities = [...entitySet];
    if (!proj.derivedBy) proj.derivedBy = [];
    proj.derivedBy.push(witnessR9Composite(proj.mainEntity, joins, projId));
  }

  return projections;
}
