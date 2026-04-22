// subEntityHelpers.js
//
// Helpers для обнаружения sub-entities и построения section-дескрипторов
// для паттерна detail/subcollections (structure.apply).
//
// Логика:
//   - findSubEntities(ontology, mainEntity) — находит дочерние сущности по foreignKey
//     или по соглашению <mainLower>Id. Возвращает массив { entity, fkField },
//     отсортированный алфавитно по entity.
//   - sectionIdFor(entity) — "Position" → "positions".
//   - buildSection(entity, fkField, intents, ontology) — строит section descriptor
//     с отфильтрованными по sub-entity интентами и layout (list | m2m).

/**
 * FK candidates для mainEntity — по соглашению имени поля.
 *   - "<mainLower>Id" (Portfolio → portfolioId)
 *   - last camelCase-segment lowercased + "Id" (MoodEntry → entryId)
 * Role-specific FK (sellerId / targetUserId) — вне scope, требует hint'ов
 * в онтологии.
 */
function fkCandidates(mainEntity) {
  const candidates = new Set();
  candidates.add(mainEntity.toLowerCase() + "Id");
  const segments = mainEntity.split(/(?=[A-Z])/);
  if (segments.length > 1) {
    const lastLower = segments[segments.length - 1].toLowerCase();
    candidates.add(lastLower + "Id");
  }
  return candidates;
}

/**
 * Find sub-entities: entities whose fields reference mainEntity via foreignKey.
 * Also supports convention-based discovery: `<mainLower>Id` и last camelCase-segment.
 * Result ordered alphabetically by entity name.
 */
export function findSubEntities(ontology, mainEntity) {
  if (!ontology?.entities || !mainEntity) return [];
  const fkCandidatesSet = fkCandidates(mainEntity);
  const result = [];
  for (const [entityName, entity] of Object.entries(ontology.entities)) {
    if (entityName === mainEntity) continue;
    const fields = normalizeFields(entity.fields);
    for (const [fieldName, def] of Object.entries(fields)) {
      const isExplicitFk = def?.type === "foreignKey" && def.refs === mainEntity;
      const isConventionFk = fkCandidatesSet.has(fieldName);
      if (isExplicitFk || isConventionFk) {
        result.push({ entity: entityName, fkField: fieldName });
        break;
      }
    }
  }
  return result.sort((a, b) => a.entity.localeCompare(b.entity));
}

function normalizeFields(fields) {
  if (!fields) return {};
  if (Array.isArray(fields)) {
    const out = {};
    for (const f of fields) out[f] = {};
    return out;
  }
  return fields;
}

/**
 * Plural form entity-name'а для section.id.
 * Правила (по порядку):
 *   - X ends in "y" preceded by consonant → "ies" (delivery → deliveries)
 *   - X ends in "is" → replace "is" with "es" (hypothesis → hypotheses,
 *     analysis → analyses)
 *   - X ends in "s", "x", "z", "ch", "sh" → "+es" (box → boxes)
 *   - иначе → "+s" (portfolio → portfolios, position → positions, review → reviews)
 * Всё lowercased.
 */
export function sectionIdFor(entity) {
  const lower = entity.toLowerCase();
  if (/[^aeiou]y$/.test(lower)) return lower.slice(0, -1) + "ies";
  if (/is$/.test(lower)) return lower.slice(0, -2) + "es";
  if (/(s|x|z|ch|sh)$/.test(lower)) return lower + "es";
  return lower + "s";
}

/**
 * Build section descriptor for sub-entity.
 * Collects intents that create/modify/remove the sub-entity.
 *
 * Intent target matching — проверяем три формы:
 *   1. singular lowercase: "position" / "position.x" (canonical convention)
 *   2. camelCase plural (collection form): "transactions" / "marketSignals"
 *   3. explicit entity collection если объявлена в ontology.entities[E].collection
 *
 * Return shape совпадает с buildSubSection (crystallize_v2/assignToSlotsDetail.js)
 * чтобы renderer'у не нужно было обрабатывать два разных формата sections.
 * Поля title / itemEntity / itemView — ключевые для рендера (detail-body
 * читает exactly эти имена). Author может override'ить через
 * projection.subCollections (в этом случае apply не вмешивается вообще).
 */
export function buildSection(entity, fkField, intents, ontology) {
  const entityDef = ontology?.entities?.[entity];
  const entityLower = entity.toLowerCase();
  const collectionFromDef = typeof entityDef?.collection === "string" ? entityDef.collection : null;
  const camelPlural = entity.charAt(0).toLowerCase() + entity.slice(1) + "s";
  const targets = new Set([entityLower, camelPlural]);
  if (collectionFromDef) targets.add(collectionFromDef);

  const relevantIntents = (intents || [])
    .filter(intent => {
      if (intent.creates && stripCreatesArgs(intent.creates) === entity) return true;
      const effects = intent.particles?.effects || [];
      return effects.some(e => {
        if (typeof e.target !== "string") return false;
        for (const t of targets) {
          if (e.target === t || e.target.startsWith(t + ".")) return true;
        }
        return false;
      });
    })
    .map(i => i.id);

  const layout = entityDef?.kind === "assignment" ? "m2m" : "list";
  const sectionId = sectionIdFor(entity);
  const title = humanizeEntityName(entity);
  const itemView = buildItemViewForEntity(entity, entityDef);

  return {
    id: sectionId,
    title,
    source: "derived:subcollections",
    foreignKey: fkField,
    itemEntity: entity,
    itemView,
    itemIntents: relevantIntents,
    layout,
    emptyLabel: "Пока пусто",
    // Legacy compat: старый shape имел `entity` / `intents`. Renderer'ы
    // читающие из slots.sections ожидают itemEntity / itemIntents; дубль
    // убираем в следующем major-bump'е.
    entity,
    intents: relevantIntents,
  };
}

/**
 * Humanize PascalCase entity → display title.
 * "Catalog" → "Catalog" (single-word untouched).
 * "OrderItem" → "Order item" (camelCase split, capitalize first).
 * Применяется для section title. Для plural-form используется sectionIdFor().
 */
function humanizeEntityName(entity) {
  if (!entity) return "";
  // split on camelCase boundaries
  const parts = entity.split(/(?=[A-Z])/).map(s => s.toLowerCase());
  if (parts.length === 0) return entity;
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return parts.length === 1 ? first : first + " " + parts.slice(1).join(" ");
}

/**
 * Минимальный itemView для auto-derived section — единственный bind на
 * primary-title поле. Приоритет (по выходу):
 *   1. Поле с role === "primary-title" / fieldRole === "primary-title".
 *   2. Поле с именем из PRIMARY_TITLE_NAMES (name / title / label).
 *   3. Fallback "id".
 * Author override через projection.subCollections[].itemView — этот path
 * вообще не достигается.
 */
function buildItemViewForEntity(entity, entityDef) {
  const fields = entityDef?.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return { type: "text", bind: "id" };
  }
  // Поиск primary-title
  for (const [name, def] of Object.entries(fields)) {
    if (def?.role === "primary-title" || def?.fieldRole === "primary-title") {
      return { type: "text", bind: name, style: { fontWeight: 600 } };
    }
  }
  // Name/title/label fallback
  const PRIMARY_TITLE_NAMES = ["name", "title", "label"];
  for (const pref of PRIMARY_TITLE_NAMES) {
    if (fields[pref]) return { type: "text", bind: pref, style: { fontWeight: 600 } };
  }
  // Ultimate fallback
  return { type: "text", bind: "id" };
}

function stripCreatesArgs(creates) {
  return (creates || "").replace(/\(.*\)$/, "").trim();
}
