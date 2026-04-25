/**
 * generator-preview-matrix — шаблонные сущности с bulk-генерацией
 * требуют preview-матрицы перед commit'ом.
 *
 * Промоция из argocd-pattern-batch (2026-04-25) — ArgoCD ApplicationSet dogfood.
 * Эталоны: ArgoCD ApplicationSet (generator → N Applications),
 * GitHub Actions matrix (strategy.matrix), Jenkins build matrix.
 *
 * Trigger: mainEntity имеет (a) template/generator-like field
 * (name в ["template","spec","definition","generator","blueprint"] или
 * fieldRole === "template") + (b) поле сгенерированных выходов
 * (name matches /generated|instances|applications|jobs|outputs/ или
 * fieldRole === "generated-instances") + (c) intent с bulk-созданием
 * (intent.creates возвращает коллекцию через суффикс [] или intent.creates
 * включает entity с тем же именем что и generated-поле).
 *
 * Apply: добавляет overlay `{ id: "generator_preview", type: "generatorMatrix",
 * instancesField: <detected>, columns: [...] }` к слоту header.overlays (или
 * slots.overlays). No-op если overlay уже присутствует.
 *
 * Закрывает backlog §10 G-A-3 (ApplicationSet generator preview gate).
 */

const TEMPLATE_FIELD_NAMES = new Set([
  "template", "spec", "definition", "generator", "blueprint",
]);
const GENERATED_FIELD_RE = /generated|instances|applications|jobs|outputs/i;
const DEFAULT_COLUMNS = ["name", "id"];
const PREFERRED_COLUMNS = ["name", "namespace", "cluster", "status", "id"];

/**
 * Определяет «template»-like поле в entity.
 * Возвращает имя поля или null.
 */
export function detectTemplateField(entity) {
  if (!entity?.fields || typeof entity.fields !== "object") return null;
  for (const [name, def] of Object.entries(entity.fields)) {
    if (TEMPLATE_FIELD_NAMES.has(name.toLowerCase())) return name;
    if (def?.fieldRole === "template") return name;
  }
  return null;
}

/**
 * Определяет поле сгенерированных выходов в entity.
 * Возвращает имя поля или null.
 */
export function detectGeneratedField(entity) {
  if (!entity?.fields || typeof entity.fields !== "object") return null;
  for (const [name, def] of Object.entries(entity.fields)) {
    if (GENERATED_FIELD_RE.test(name)) return name;
    if (def?.fieldRole === "generated-instances") return name;
  }
  return null;
}

/**
 * Проверяет, является ли intent bulk-creation (создаёт коллекцию).
 * Признаки:
 *   - intent.creates содержит [] (ApplicationSet[])
 *   - intent.creates === "$mainEntity" (single — исключаем)
 *   - intent.generates или intent.bulk === true (author hint)
 */
function isBulkCreationIntent(intent, mainEntity) {
  const creates = intent?.creates;
  if (!creates) return false;
  // Если creates — массив или содержит [] → bulk
  if (Array.isArray(creates)) return true;
  if (typeof creates === "string" && creates.includes("[]")) return true;
  // Author-hint
  if (intent.bulk === true || intent.generates === true) return true;
  // creates !== mainEntity → возможно создаёт derived-entity
  if (typeof creates === "string") {
    const normalized = creates.replace(/\(.*\)$/, "").trim();
    if (normalized !== mainEntity && normalized.length > 0) return true;
  }
  return false;
}

/**
 * Выводит column-список из ontology generated-entity.
 * Приоритет: PREFERRED_COLUMNS в порядке их наличия в entity.fields,
 * иначе DEFAULT_COLUMNS.
 */
function deriveColumns(generatedEntityName, ontology) {
  const entity = ontology?.entities?.[generatedEntityName];
  if (!entity?.fields) return DEFAULT_COLUMNS.slice();
  const available = new Set(Object.keys(entity.fields));
  const cols = PREFERRED_COLUMNS.filter(c => available.has(c));
  return cols.length >= 2 ? cols : DEFAULT_COLUMNS.slice();
}

/**
 * Подбирает имя generated-entity из имени поля (pluralization heuristic).
 * "applications" → "Application", "instances" → "Instance" и т.д.
 */
function guessGeneratedEntityName(fieldName, ontology) {
  if (!ontology?.entities) return null;
  // Прямая проверка: поле само является foreign-collection name?
  const lc = fieldName.toLowerCase();
  for (const entityName of Object.keys(ontology.entities)) {
    const entityLc = entityName.toLowerCase();
    if (lc === entityLc || lc === entityLc + "s" || lc === entityLc + "es"
        || lc === entityLc.replace(/y$/, "ies")) {
      return entityName;
    }
  }
  return null;
}

export default {
  id: "generator-preview-matrix",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [],
    /**
     * Matches: detail + mainEntity имеет template-like field +
     * generated-like field + хотя бы один bulk-creation intent.
     */
    match(intents, ontology, projection) {
      if (projection?.archetype && projection.archetype !== "detail") return false;
      const mainEntity = projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity) return false;

      // (a) template-like field
      if (!detectTemplateField(entity)) return false;

      // (b) generated-like field
      if (!detectGeneratedField(entity)) return false;

      // (c) bulk-creation intent присутствует
      const hasBulkIntent = intents.some(intent => isBulkCreationIntent(intent, mainEntity));
      if (!hasBulkIntent) return false;

      return true;
    },
  },
  structure: {
    slot: "overlays",
    description:
      "Добавляет overlay { id: 'generator_preview', type: 'generatorMatrix', instancesField, columns } " +
      "к slots.overlays (создаёт массив если нужно). Renderer dispatcher вставит preview-матрицу " +
      "перед confirm'ом bulk-creation intent'а. No-op если overlay уже существует (author или " +
      "предыдущий apply). Author-override: projection.generatorPreview: false отключает.",
    apply(slots, context) {
      const { projection, ontology, mainEntity: ctxMainEntity } = context;

      // Author-override
      if (projection?.generatorPreview === false) return slots;

      const mainEntity = ctxMainEntity || projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity) return slots;

      const templateField = detectTemplateField(entity);
      const generatedField = detectGeneratedField(entity);
      if (!templateField || !generatedField) return slots;

      // Убедимся, что overlay ещё не задан
      const existingOverlays = Array.isArray(slots?.overlays) ? slots.overlays : [];
      if (existingOverlays.some(o => o?.id === "generator_preview" || o?.type === "generatorMatrix")) {
        return slots;
      }

      // Выводим columns из generated-entity (если распознали) или defaults
      const generatedEntityName = guessGeneratedEntityName(generatedField, ontology);
      const columns = generatedEntityName
        ? deriveColumns(generatedEntityName, ontology)
        : DEFAULT_COLUMNS.slice();

      const overlay = {
        id: "generator_preview",
        type: "generatorMatrix",
        templateField,
        instancesField: generatedField,
        columns,
        source: "derived:generator-preview-matrix",
      };

      return {
        ...slots,
        overlays: [...existingOverlays, overlay],
      };
    },
  },
  rationale: {
    hypothesis:
      "Template + generator — высокий blast-radius: один клик создаёт N instances. " +
      "Без preview пользователь играет в рулетку: сколько объектов будет создано, " +
      "с какими параметрами. Preview-матрица превращает template в explicable blueprint " +
      "с gate перед commit — снижает irreversible side-effects и повышает доверие к UI.",
    evidence: [
      {
        source: "ArgoCD ApplicationSet Web UI",
        description: "Generator preview перед sync: shows N Applications с namespace/cluster/name до apply",
        reliability: "high",
      },
      {
        source: "GitHub Actions matrix strategy",
        description: "Preview runner-matrix (OS × version) с count и estimated time перед trigger",
        reliability: "high",
      },
      {
        source: "Jenkins build matrix",
        description: "Stage-matrix preview: OS × Java version, expand button раскрывает N builds",
        reliability: "high",
      },
      {
        source: "Terraform plan",
        description: "\"Plan: N to add, M to change, K to destroy\" — explicit preview gate перед apply",
        reliability: "high",
      },
    ],
    counterexample: [
      {
        source: "booking/specialist_detail",
        description: "Одиночное booking — не bulk; нет generator-field, нет blast-radius",
        reliability: "high",
      },
      {
        source: "messenger/conversation_detail",
        description: "Нет template/generator field, нет bulk-creation intent",
        reliability: "high",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      {
        domain: "argocd",
        projection: "applicationset_detail",
        reason: "ApplicationSet: spec (template-field) + applications (generated-field) + sync_applicationset (bulk-creation intent)",
      },
      {
        domain: "workflow",
        projection: "workflow_detail",
        reason: "Workflow: template + scheduled instances matrix — generator-preview gate уместен",
      },
    ],
    shouldNotMatch: [
      {
        domain: "booking",
        projection: "booking_detail",
        reason: "Booking: нет template-like field и нет bulk-creation intent",
      },
      {
        domain: "messenger",
        projection: "conversation_detail",
        reason: "Conversation: нет generator/template semantics",
      },
    ],
  },
  // Helpers exported для тестов и reuse
  _helpers: { detectTemplateField, detectGeneratedField },
};
