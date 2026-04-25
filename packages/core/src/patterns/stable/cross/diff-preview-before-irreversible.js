/**
 * diff-preview-before-irreversible (stable, cross).
 *
 * Гипотеза: `irreversible-confirm` показывает «вы уверены?», но не ЧТО
 * именно необратимо. Когда изменение — мутация structured документа
 * (YAML, config, schema), пользователь должен видеть строчный diff до commit.
 * Side-by-side снижает rollback-after-rollback частоту.
 *
 * Триггер: entity имеет ≥2 поля, выражающих dual-state:
 *   - имена типа "current"+"target", "live"+"desired", "before"+"after"
 *   - ИЛИ fieldRole pairs: "current-state" + "desired-state"
 * И есть intent с irreversibility === "high" на mainEntity.
 *
 * Apply: для каждого overlay.kind === "confirmDialog" с irreversibility флагом
 * добавляет `showDiff: true` + `diffFields: { from, to }`.
 * No-op если showDiff уже задан или пара полей не найдена.
 *
 * Эталоны: ArgoCD rollback dialog (YAML diff), GitHub PR merge,
 * Terraform plan output.
 */

const DUAL_STATE_PAIRS = [
  ["current", "target"],
  ["live",    "desired"],
  ["before",  "after"],
];

const DUAL_ROLE_PAIRS = [
  ["current-state", "desired-state"],
];

/**
 * Ищет первую пару dual-state полей в сущности.
 * Возвращает { from, to } или null.
 *
 * @param {object} entityFields — поля из ontology.entities[X].fields
 * @returns {{ from: string, to: string } | null}
 */
function detectDualStateFields(entityFields) {
  if (!entityFields || typeof entityFields !== "object") return null;

  const fieldNames = Object.keys(entityFields);

  // 1. Проверка по fieldRole pairs (current-state / desired-state)
  for (const [fromRole, toRole] of DUAL_ROLE_PAIRS) {
    const fromField = fieldNames.find(
      k => entityFields[k]?.fieldRole === fromRole,
    );
    const toField = fieldNames.find(
      k => entityFields[k]?.fieldRole === toRole,
    );
    if (fromField && toField) return { from: fromField, to: toField };
  }

  // 2. Проверка по имени поля (ищем пары через contains)
  const lowerNames = fieldNames.map(k => ({ key: k, lower: k.toLowerCase() }));
  for (const [fromKw, toKw] of DUAL_STATE_PAIRS) {
    const fromField = lowerNames.find(({ lower }) => lower.includes(fromKw));
    const toField   = lowerNames.find(({ lower }) => lower.includes(toKw));
    if (fromField && toField && fromField.key !== toField.key) {
      return { from: fromField.key, to: toField.key };
    }
  }

  return null;
}

export default {
  id: "diff-preview-before-irreversible",
  version: 1,
  status: "stable",
  archetype: null,  // cross-archetype
  trigger: {
    requires: [],
    /**
     * Матчится когда:
     * 1. В ontology.entities[mainEntity] есть dual-state пара полей.
     * 2. Среди intents есть хотя бы один с irreversibility === "high".
     */
    match(intents, ontology, projection) {
      const hasIrr = (intents || []).some(i => i?.irreversibility === "high");
      if (!hasIrr) return false;

      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;

      const entityDef = ontology?.entities?.[mainEntity];
      if (!entityDef) return false;

      return detectDualStateFields(entityDef.fields) !== null;
    },
  },
  structure: {
    slot: "overlay",
    description:
      "Расширяет confirmDialog overlay для высоко-необратимых операций: " +
      "добавляет showDiff + diffFields({ from, to }) если у mainEntity " +
      "есть пара dual-state полей (current/target, live/desired, before/after).",
    /**
     * Apply: обогащает confirmDialog overlay entries полями showDiff + diffFields.
     * Idempotent — не перезаписывает entry, у которого showDiff уже задан.
     * Чистая функция: не мутирует входные объекты.
     */
    apply(slots, context) {
      const { intents, ontology, projection } = context || {};

      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return slots;

      const entityDef = ontology?.entities?.[mainEntity];
      if (!entityDef) return slots;

      const diffFields = detectDualStateFields(entityDef.fields);
      if (!diffFields) return slots;

      // Множество intent'ов с irreversibility:high для быстрого lookup
      const irrIntentIds = new Set(
        (intents || [])
          .filter(i => i?.irreversibility === "high" && i?.id)
          .map(i => i.id),
      );
      if (irrIntentIds.size === 0) return slots;

      const overlay = slots?.overlay || [];
      let changed = false;

      const nextOverlay = overlay.map(entry => {
        if (!entry || entry.type !== "confirmDialog") return entry;
        // Проверяем, что overlay соответствует high-irr intent'у
        if (entry.triggerIntentId && !irrIntentIds.has(entry.triggerIntentId)) {
          return entry;
        }
        // No-op если showDiff уже задан
        if (entry.showDiff !== undefined && entry.showDiff !== null) {
          return entry;
        }
        changed = true;
        return { ...entry, showDiff: true, diffFields };
      });

      if (!changed) return slots;
      return { ...slots, overlay: nextOverlay };
    },
  },
  rationale: {
    hypothesis:
      "irreversible-confirm показывает «вы уверены?», но не ЧТО именно " +
      "необратимо. Когда изменение — мутация structured документа, пользователь " +
      "должен видеть строчный diff до commit. Side-by-side снижает " +
      "rollback-after-rollback частоту.",
    evidence: [
      {
        source: "argocd",
        description: "Rollback dialog показывает YAML diff текущего vs целевого ревижна",
        reliability: "high",
      },
      {
        source: "github",
        description: "PR merge: diff file-by-file до нажатия Merge",
        reliability: "high",
      },
      {
        source: "terraform",
        description: "terraform plan выводит +/- diff до apply",
        reliability: "high",
      },
    ],
    counterexample: [
      {
        source: "simple-delete",
        description: "Удаление сущности без structured payload — diff нечего показывать",
        reliability: "high",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      {
        domain: "workflow",
        projection: "workflow_detail",
        reason: "Workflow имеет currentSpec + targetSpec (dual-state) + delete_workflow: irreversibility=high",
      },
    ],
    shouldNotMatch: [
      {
        domain: "freelance",
        projection: "deal_detail",
        reason: "Deal не имеет dual-state полей — нет current/target config пары",
      },
      {
        domain: "compliance",
        projection: "je_detail",
        reason: "JournalEntry — state-transition only (status переходы), нет structured dual-state",
      },
    ],
  },
  _helpers: { detectDualStateFields },
};
