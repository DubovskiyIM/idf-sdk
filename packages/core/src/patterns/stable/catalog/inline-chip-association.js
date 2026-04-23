/**
 * inline-chip-association — m2m-связи отображаются как chips прямо в строке
 * catalog-списка: kebab-иконка «+» открывает picker для attach, «×» на chip
 * делает detach без перехода в detail.
 *
 * Отличается от m2m-attach-dialog (detail): здесь операция не требует открытия
 * detail, chip-группа рендерится inline в row. Удобно для tag-like ассоциаций
 * (Tags, Policies, Labels), где навигация в detail — лишний шаг.
 *
 * Сигнал: Apache Gravitino (Tags/Policies на Catalog row), GitHub labels
 * on issue-list, Jira labels-column.
 */

function findJunctionsWithAttachDetach(ontology, mainEntity, intents) {
  const mainLower = mainEntity.toLowerCase();
  const fkPatterns = [`${mainLower}id`];
  const results = [];

  for (const [entityName, entity] of Object.entries(ontology?.entities || {})) {
    if (entity?.kind !== "assignment") continue;
    const fields = entity.fields || {};
    const fieldNames = Object.keys(fields);

    const fkField = fieldNames.find(f =>
      fkPatterns.includes(f.toLowerCase()) &&
      (fields[f]?.type === "entityRef" || fields[f]?.type === "id"),
    );
    if (!fkField) continue;

    // otherField — второй FK (не на mainEntity, не id)
    const otherField = fieldNames.find(f => {
      if (f === fkField || f === "id") return false;
      const def = fields[f];
      if (def?.type !== "entityRef" && def?.type !== "id") return false;
      return f.toLowerCase().endsWith("id");
    });

    // Ищем attach-intent (creates этого junction) и detach-intent (α:remove на этот
    // junction, т. е. user-initiated unlink).
    const attachIntent = (intents || []).find(i => {
      if (!i.creates) return false;
      const normalized = i.creates.replace(/\(.*\)$/, "").trim();
      return normalized === entityName;
    });
    if (!attachIntent) continue;

    // detach: α:remove; точно привязанный к junction через naming (remove_<snake>,
    // unassign_*, detach_*). Если нет точного match'а — берём любой remove-intent,
    // упоминающий junction-имя в id.
    const lowerJunction = entityName.toLowerCase();
    const detachIntent = (intents || []).find(i => {
      const effects = i.particles?.effects || [];
      if (!effects.some(e => e.α === "remove")) return false;
      const idLower = String(i.id || "").toLowerCase();
      return idLower.includes(lowerJunction) ||
        idLower.startsWith("unassign") ||
        idLower.startsWith("detach") ||
        idLower.startsWith("unlink") ||
        (otherField && idLower.includes(otherField.toLowerCase().replace(/id$/, "")));
    });
    if (!detachIntent) continue;

    const otherEntity = otherField
      ? capitalize(otherField.replace(/Id$/i, ""))
      : null;

    results.push({
      junction: entityName,
      fkField,
      otherField,
      otherEntity,
      attachIntentId: attachIntent.id,
      detachIntentId: detachIntent.id,
    });
  }
  return results;
}

function capitalize(s) {
  return s && s.charAt(0).toUpperCase() + s.slice(1);
}

export default {
  id: "inline-chip-association",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "intent-creates" },
    ],
    match(intents, ontology, projection) {
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;
      const found = findJunctionsWithAttachDetach(ontology, mainEntity, intents);
      return found.length > 0;
    },
  },
  structure: {
    slot: "rowAssociations",
    description:
      "На catalog-строке mainEntity — inline chip-группа на каждую m2m-junction: " +
      "кнопка «+» открывает picker для attach, «×» на chip вызывает detach. " +
      "Рендер без навигации в detail — операции выполняются per-row.",
    /**
     * Apply: для каждой assignment-junction с FK на mainEntity и парой
     * attach/detach intent'ов добавляет запись в `slots.rowAssociations`.
     * Renderer использует её чтобы включить chip-column в row.
     *
     * Idempotent: existing rowAssociation с тем же id не перезаписывается.
     */
    apply(slots, context) {
      const { ontology, mainEntity, intents } = context || {};
      if (!mainEntity || !ontology?.entities) return slots;

      const found = findJunctionsWithAttachDetach(ontology, mainEntity, intents);
      if (found.length === 0) return slots;

      const existing = slots?.rowAssociations || [];
      const existingIds = new Set(existing.map(a => a?.id).filter(Boolean));

      const newEntries = found
        .map(j => ({
          id: `chip_${j.junction.toLowerCase()}`,
          junction: j.junction,
          foreignKey: j.fkField,
          otherField: j.otherField,
          otherEntity: j.otherEntity,
          attachIntent: j.attachIntentId,
          detachIntent: j.detachIntentId,
          rendering: "chipRow",
          source: "derived:inline-chip-association",
        }))
        .filter(entry => !existingIds.has(entry.id));

      if (newEntries.length === 0) return slots;

      return {
        ...slots,
        rowAssociations: [...existing, ...newEntries],
      };
    },
  },
  rationale: {
    hypothesis:
      "M2M-ассоциации часто требуется увидеть и изменить в контексте строки, без " +
      "навигации в detail. Chips в row дают scan-and-act без смены контекста и " +
      "унифицируют UX для всех tag-like связей (одна chip-реализация — много m2m).",
    evidence: [
      { source: "gravitino-webui", description: "Tag/Policy chip-group inline в Catalog-list", reliability: "high" },
      { source: "github-labels", description: "Labels column в issues-list со popover picker", reliability: "high" },
      { source: "jira-labels", description: "Labels в issue-row — inline add/remove", reliability: "high" },
    ],
    counterexample: [
      {
        source: "1:1-assignment",
        description: "Single-owner FK (userId на Listing) — не m2m, chip-паттерн не нужен",
        reliability: "high",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "delivery", projection: "zones_root", reason: "DispatcherAssignment junction m2m на Zone — диспетчеры как chips" },
    ],
    shouldNotMatch: [
      { domain: "planning", projection: "my_polls", reason: "Poll не имеет assignment-junction" },
      { domain: "booking", projection: "services_root", reason: "Service не в m2m-связях" },
    ],
  },
};
