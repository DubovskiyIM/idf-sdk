/**
 * entity-owner-column — добавляет Owner column с ownerAvatar kind когда
 * entity ontology имеет owner field. Renders AvatarChip primitive
 * (Phase 3 SDK extension; Phase 2 декларирует kind, host fallback'ит на
 * chipAssociation/text rendering до завершения интеграции).
 *
 * Insertion strategy: перед `tags` column (если tags есть) — Gravitino
 * UX-конвенция: name → owner → tags → policies. Иначе — в конец.
 *
 * U-derive Phase 2 (gravitino-driven).
 */

export const PATTERN = {
  id: "entity-owner-column",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "entity-field", field: "owner" },
    ],
  },
  structure: {
    slot: "body",
    description:
      "Добавляет Owner column { kind: 'ownerAvatar', editIntent: 'setOwner' } " +
      "в catalog dataGrid когда entity имеет owner field. Insert перед tags " +
      "если tags column есть, иначе в конец. Author-override: existing owner column сохраняется.",
    apply(slots, context) {
      if (!slots?.body || slots.body.type !== "dataGrid") return slots;
      if (!Array.isArray(slots.body.columns)) return slots;
      if (slots.body.columns.some(c => c.key === "owner")) return slots;

      const entityName = context?.projection?.mainEntity;
      const entity = context?.ontology?.entities?.[entityName];
      if (!entity?.fields?.owner) return slots;

      const newCol = {
        key: "owner",
        label: "Owner",
        kind: "ownerAvatar",
        editIntent: "setOwner",
        placeholder: "+ Set Owner",
      };

      const cols = [...slots.body.columns];
      const tagsIdx = cols.findIndex(c => c.key === "tags");
      const insertAt = tagsIdx >= 0 ? tagsIdx : cols.length;
      cols.splice(insertAt, 0, newCol);

      return { ...slots, body: { ...slots.body, columns: cols } };
    },
  },
  rationale: {
    hypothesis:
      "Owner — first-class metadata в admin сущностях. Visible chip + edit shortcut " +
      "уменьшает trip в detail для смены ответственного.",
    evidence: [
      { source: "Apache Gravitino v2 WebUI", description: "Owner column на каждой metadata entity (catalog/schema/table)", reliability: "high" },
      { source: "Linear", description: "Assignee chip-column в issue list", reliability: "high" },
      { source: "GitHub", description: "Assignees inline в issue/PR list", reliability: "high" },
    ],
    counterexample: [
      { source: "feed без ownership", description: "Messenger conversations — нет owner field", reliability: "high" },
      { source: "anonymous catalog", description: "Public listings без явного owner", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "gravitino", projection: "metalake_list", reason: "Metalake имеет owner field в ontology" },
      { domain: "gravitino", projection: "catalog_list",  reason: "Catalog имеет owner field" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "conversations_feed", reason: "Conversation без owner — sender — не owner" },
      { domain: "invest",    projection: "marketdata_root",     reason: "MarketData reference-asset без owner" },
    ],
  },
};

export default PATTERN;
