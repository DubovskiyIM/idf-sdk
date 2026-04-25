/**
 * resource-hierarchy-canvas — sub-collection с self-referential FK + status
 * рендерится как tree-canvas (вместо плоской list-section).
 *
 * Promote'ится из argocd-pattern-batch (2026-04-24): argocd-web-ui кандидат.
 * Эталоны: ArgoCD Application resource tree (Deployment → ReplicaSet → Pod),
 * Kubernetes Dashboard ownerReferences graph, Temporal child workflows tree.
 *
 * Trigger: detail + sub-entity (FK to mainEntity) с собственным self-referential
 * FK (parentXxxId / parentId) + ≥1 status-like enum-полем. Это формальный
 * признак иерархической runtime-структуры, не плоского списка.
 *
 * Apply: находит matching subcollection section (auto-derived от
 * `subcollections` pattern или authored с такими же признаками), выставляет
 * `section.renderAs = { type: "resourceTree", parentField, nameField, kindField,
 * badgeColumns: [...] }`. Renderer dispatcher (renderer/src/archetypes/
 * SubCollectionSection.jsx §10.4c) подхватит это и отрендерит через
 * <ResourceTree> primitive.
 *
 * Закрывает backlog §10 G-A-2 (ArgoCD inline-children resources): host больше
 * не должен вручную выставлять `section.renderAs = { type: "resourceTree", ...}`.
 *
 * Apply order: ПОСЛЕ subcollections (нам нужны уже сгенерированные sections).
 * Author-override: если у section уже есть `renderAs.type` — no-op.
 */

const STATUS_NAME_HINTS = [/Status$/i, /State$/i, /Phase$/i, /Health$/i];
const NAME_FIELD_PREFS = ["name", "title", "label", "id"];
const KIND_FIELD_PREFS = ["kind", "type", "resourceType", "category"];

function looksLikeStatusField(fieldName, fieldDef) {
  if (!fieldDef) return false;
  const hasValues = Array.isArray(fieldDef.values) && fieldDef.values.length >= 2;
  if (!hasValues) return false;
  if (fieldDef.fieldRole === "status") return true;
  if (typeof fieldName === "string" && STATUS_NAME_HINTS.some(re => re.test(fieldName))) return true;
  return false;
}

/**
 * Проверяет, что сущность имеет self-referential FK — поле, ссылающееся на
 * сам entity. Признаки (в порядке приоритета):
 *   1. Explicit FK: field.type === "foreignKey" && (field.refs || field.references) === entityName
 *      ИЛИ field.kind === "foreignKey" && (field.refs || field.references) === entityName
 *      (поддерживает {type:"entityRef", kind:"foreignKey"} — IDF importer convention)
 *   2. Convention с Id-суффиксом: parentXxxId (parentResourceId, parentNodeId)
 *   3. Convention без Id-суффикса: parentXxx (parentResource, parentNode)
 *   4. Generic fallback: parentId, parent
 */
export function findSelfRefField(entityName, entity) {
  const fields = entity?.fields;
  if (!fields || typeof fields !== "object") return null;
  // 1. Explicit FK — проверяем type="foreignKey" | kind="foreignKey", refs | references
  for (const [name, def] of Object.entries(fields)) {
    if (!def) continue;
    const isFkType = def.type === "foreignKey" || def.kind === "foreignKey";
    const refTarget = def.refs || def.references;
    if (isFkType && refTarget === entityName) return name;
  }
  // 2. Convention с Id-суффиксом: parent<EntityName>Id
  const parentById = `parent${entityName}Id`;
  if (fields[parentById]) return parentById;
  // 3. Convention без Id-суффикса: parent<EntityName>
  const parentByName = `parent${entityName}`;
  if (fields[parentByName]) return parentByName;
  // 4. Generic fallback
  for (const candidate of ["parentId", "parentResourceId", "parent"]) {
    if (fields[candidate]) return candidate;
  }
  return null;
}

/**
 * Находит ≥1 status-like field в entity. Возвращает array из {bind, label, values}
 * (преимущество порядку declaration). Возвращает [] если status нет.
 */
function findStatusFields(entity) {
  const fields = entity?.fields;
  if (!fields) return [];
  const out = [];
  for (const [name, def] of Object.entries(fields)) {
    if (looksLikeStatusField(name, def)) {
      out.push({ field: name, label: def.label || name, values: def.values });
    }
  }
  return out;
}

/**
 * Подбирает name-field сущности (для вывода label узла дерева).
 */
function pickNameField(entity) {
  const fields = entity?.fields;
  if (!fields) return "id";
  for (const pref of NAME_FIELD_PREFS) {
    if (fields[pref]) return pref;
  }
  return "id";
}

/**
 * Подбирает kind-field (если есть) — discriminator для иконки/метки в дереве.
 */
function pickKindField(entity) {
  const fields = entity?.fields;
  if (!fields) return null;
  for (const pref of KIND_FIELD_PREFS) {
    if (fields[pref]) return pref;
  }
  return null;
}

export default {
  id: "resource-hierarchy-canvas",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "sub-entity-exists", foreignKeyTo: "$mainEntity" },
    ],
    /**
     * Matches: detail + есть sub-entity с FK на mainEntity, у которой:
     *  (a) собственный self-referential FK (parent-link), И
     *  (b) ≥1 status-like enum-field
     */
    match(intents, ontology, projection) {
      if (projection?.archetype && projection.archetype !== "detail") return false;
      const mainEntity = projection?.mainEntity;
      const entities = ontology?.entities;
      if (!mainEntity || !entities) return false;
      // Find any sub-entity that satisfies (a) + (b)
      for (const [entityName, entity] of Object.entries(entities)) {
        if (entityName === mainEntity) continue;
        if (!hasFkTo(entity, mainEntity)) continue;
        if (!findSelfRefField(entityName, entity)) continue;
        if (findStatusFields(entity).length === 0) continue;
        return true;
      }
      return false;
    },
  },
  structure: {
    slot: "sections",
    description: "Для sub-collection sections, чьи itemEntity имеют self-referential FK + status-field, выставляет section.renderAs = { type: 'resourceTree', parentField, nameField, kindField?, badgeColumns: [{field, label}] }. Renderer dispatcher (SubCollectionSection.jsx §10.4c) переключает рендер на ResourceTree primitive вместо плоского list. Закрывает backlog §10 G-A-2.",
    /**
     * Apply: для каждой section в slots.sections, чей itemEntity матчит
     * (self-FK + status), выставляет renderAs (если ещё не задан).
     */
    apply(slots, context) {
      const { ontology } = context;
      const sections = slots?.sections;
      if (!Array.isArray(sections) || sections.length === 0) return slots;
      const entities = ontology?.entities;
      if (!entities) return slots;

      let mutated = false;
      const newSections = sections.map(section => {
        // Author-override: если renderAs уже задан, не вмешиваемся.
        if (section?.renderAs?.type) return section;
        const itemEntity = section?.itemEntity;
        if (!itemEntity) return section;
        const entity = entities[itemEntity];
        if (!entity) return section;
        const parentField = findSelfRefField(itemEntity, entity);
        if (!parentField) return section;
        const statusFields = findStatusFields(entity);
        if (statusFields.length === 0) return section;

        mutated = true;
        const renderAs = {
          type: "resourceTree",
          nameField: pickNameField(entity),
          parentField,
          badgeColumns: statusFields.map(s => ({ field: s.field, label: s.label })),
        };
        const kindField = pickKindField(entity);
        if (kindField) renderAs.kindField = kindField;
        return { ...section, renderAs };
      });

      if (!mutated) return slots;
      return { ...slots, sections: newSections };
    },
  },
  rationale: {
    hypothesis: "Плоский subCollections-список теряет структурную информацию когда сущности иерархичны. Инженерные домены (k8s-ресурсы, процесс-деревья, child-workflows) требуют tree visualization как primary lens — root-cause анализ идёт через структуру (kubectl describe → owners), не через плоский фильтр. Self-referential FK + status — формальная подпись tree-shape.",
    evidence: [
      { source: "ArgoCD Web UI", description: "Application detail = resource-tree canvas: Deployment → ReplicaSet → Pod, health propagates вверх, sync-icon в углу", reliability: "high" },
      { source: "Kubernetes Dashboard", description: "Workload-pages рендерят ownerReferences как граф", reliability: "high" },
      { source: "Temporal Web UI", description: "Workflow execution — дерево child-workflows со status-цветом узлов", reliability: "high" },
      { source: "Lens IDE", description: "K8s ресурсы — tree view с owner-edge'ами", reliability: "high" },
    ],
    counterexample: [
      { source: "messenger / conversation", description: "Conversation.messages — линейная лента, дерево overkill", reliability: "high" },
      { source: "sales / listing.bids", description: "Bids — плоская коллекция без иерархии", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "argocd", projection: "application_detail", reason: "Application имеет Resource sub-entity с parentResourceId + healthStatus enum" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "listing_detail", reason: "Bid sub-entity без self-FK — плоский список" },
      { domain: "booking", projection: "specialist_detail", reason: "Service sub-entity без иерархии и status enum" },
      { domain: "invest", projection: "portfolios_root", reason: "catalog, не detail" },
    ],
  },
  // Helpers exported для тестов
  _helpers: { findSelfRefField, findStatusFields, pickNameField, pickKindField, looksLikeStatusField },
};

function hasFkTo(entity, targetEntity) {
  const fields = entity?.fields;
  if (!fields) return false;
  for (const def of Object.values(fields)) {
    if (def?.type === "foreignKey" && def?.refs === targetEntity) return true;
  }
  // Convention-based: <targetLower>Id
  const conventionFk = targetEntity.charAt(0).toLowerCase() + targetEntity.slice(1) + "Id";
  return Boolean(fields[conventionFk]);
}
