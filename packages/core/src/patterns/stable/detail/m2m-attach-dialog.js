/**
 * Найти assignment/junction entities c FK на mainEntity.
 * Возвращает массив { entity, fkField, otherField, otherEntity }:
 *   - entity     — имя junction-сущности
 *   - fkField    — поле FK на mainEntity (например, "portfolioId")
 *   - otherField — второе FK поле (например, "advisorId")
 *   - otherEntity — name сущности по ту сторону junction (опц., из kind или name
 *     pattern fieldName без "Id")
 */
function findAssignmentEntities(ontology, mainEntity) {
  const results = [];
  if (!ontology?.entities || !mainEntity) return results;
  const mainLower = mainEntity.toLowerCase();

  for (const [entityName, entity] of Object.entries(ontology.entities)) {
    if (entity?.kind !== "assignment") continue;
    const fields = entity.fields || {};
    const fieldNames = Object.keys(fields);

    // FK на mainEntity: поле с типом entityRef / name заканчивается на `${mainLower}Id`
    const fkField = fieldNames.find(f => {
      const typeMatch = fields[f]?.type === "entityRef" || fields[f]?.type === "id";
      const nameMatch = f.toLowerCase() === `${mainLower}id`;
      return typeMatch && nameMatch;
    });
    if (!fkField) continue;

    // otherField — другой FK (не mainEntity). Для assignment-entity
    // это часто ownerField (advisorId, participantId) — не исключаем.
    const otherField = fieldNames.find(f => {
      if (f === fkField) return false;
      if (f === "id") return false;
      const typeMatch = fields[f]?.type === "entityRef" || fields[f]?.type === "id";
      const nameMatch = f.toLowerCase().endsWith("id");
      return typeMatch && nameMatch;
    });

    const otherEntity = otherField
      ? capitalize(otherField.replace(/Id$/, ""))
      : null;

    results.push({ entity: entityName, fkField, otherField, otherEntity });
  }
  return results;
}

function capitalize(s) {
  return s && s.charAt(0).toUpperCase() + s.slice(1);
}

function buildAttachSection({ entity, fkField, otherField, otherEntity }) {
  return {
    id: `m2m_${entity.toLowerCase()}`,
    title: otherEntity ? `Связанные ${pluralize(otherEntity)}` : `Связи (${entity})`,
    kind: "attachList",
    entity,
    foreignKey: fkField,
    otherField,
    otherEntity,
    // Renderer-hint: attachControl — multi-select dialog с каталогом
    // otherEntity. Runtime клики → exec creator-intent для assignment.
    attachControl: otherEntity ? {
      type: "attachDialog",
      multiSelect: true,
      otherEntity,
    } : null,
    source: "derived:m2m-attach-dialog",
  };
}

function pluralize(s) {
  if (!s) return "";
  // Простая плюрализация — наращиваем "s" для en-терминологии; для RU
  // имён сущностей авторы часто кладут `User` → `Users` (или authored label).
  return s.endsWith("s") ? s : `${s}s`;
}

export default {
  id: "m2m-attach-dialog",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      // m2m через assignment/junction entity: entity с 2+ FK полей (sourceId, targetId)
      // ИЛИ role.scope с via (advisor → clients)
      if (!ontology) return false;

      // Путь 1: role.scope с m2m via
      if (ontology.roles) {
        for (const role of Object.values(ontology.roles)) {
          if (role.scope) {
            for (const scopeDef of Object.values(role.scope)) {
              if (scopeDef.via) return true;
            }
          }
        }
      }

      // Путь 2: assignment entity с kind="assignment" в онтологии
      if (ontology.entities) {
        for (const entity of Object.values(ontology.entities)) {
          if (entity.kind === "assignment") return true;
        }
      }

      return false;
    },
  },
  structure: {
    slot: "sections",
    description: "На detail-экране — секция attached items со списком + кнопка Attach, открывающая multi-select dialog из каталога кандидатов.",
    /**
     * Apply: для каждой assignment-entity с FK на mainEntity добавляет
     * секцию в `slots.sections` с itemList + attachControl. Attach open'ит
     * multi-select dialog из каталога противоположной сущности.
     *
     * Author-override (§16): existing sections с совпадающим id не
     * перезаписываются. Projections с authored subCollections побеждают.
     */
    apply(slots, context) {
      const { ontology, mainEntity, projection } = context || {};
      if (!ontology?.entities || !mainEntity) return slots;
      if (Array.isArray(projection?.subCollections) && projection.subCollections.length > 0) {
        return slots;
      }

      const assignments = findAssignmentEntities(ontology, mainEntity);
      if (assignments.length === 0) return slots;

      const existingIds = new Set((slots?.sections || []).map(s => s?.id).filter(Boolean));
      const newSections = assignments
        .filter(a => !existingIds.has(`m2m_${a.entity.toLowerCase()}`))
        .map(a => buildAttachSection(a));
      if (newSections.length === 0) return slots;

      return {
        ...slots,
        sections: [...(slots?.sections || []), ...newSections],
      };
    },
  },
  rationale: {
    hypothesis: "M2m-связи требуют выбора из большого множества. Dedicated dialog с multi-select минимизирует навигацию.",
    evidence: [
      { source: "gravitino-webui", description: "Tag/Policy attach на Catalog detail — multi-select dialog", reliability: "high" },
      { source: "github-labels", description: "Labels on issue — multi-select popover", reliability: "high" },
    ],
    counterexample: [
      { source: "messenger-contacts", description: "1:1 — multi-select не нужен", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "invest", projection: "portfolio_detail", reason: "advisor scope через assignments m2m" },
    ],
    shouldNotMatch: [
      { domain: "planning", projection: "poll_overview", reason: "Poll→TimeOption — 1:N composition, не m2m" },
    ],
  },
};
