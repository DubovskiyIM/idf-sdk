/**
 * entity-tag-policy-columns — автоматически добавляет Tags + Policies columns
 * в catalog dataGrid когда entity ontology имеет соответствующие fields.
 * Использует chipAssociation kind (renders chip-list + AssociatePopover).
 *
 * U-derive Phase 2 (gravitino-driven). Phase 3 host'ы дропнут вручную написанные
 * Tags / Policies column-config'и в проекциях — pattern apply поверх ontology
 * полей делает то же самое декларативно.
 *
 * Insertion strategy: после `name` column (если есть) — типичный Gravitino
 * UX где Tags/Policies идут сразу за именем сущности.
 */

export const PATTERN = {
  id: "entity-tag-policy-columns",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "entity-field", field: "tags" },
      { kind: "entity-field", field: "policies" },
    ],
  },
  structure: {
    slot: "body",
    description:
      "Добавляет Tags + Policies column'ы (kind: 'chipAssociation') в catalog dataGrid " +
      "когда entity имеет оба поля. Insert после `name` column (если присутствует), " +
      "иначе в конец. Author-override: existing tags / policies column сохраняется (no double).",
    apply(slots, context) {
      if (!slots?.body || slots.body.type !== "dataGrid") return slots;
      if (!Array.isArray(slots.body.columns)) return slots;

      const entityName = context?.projection?.mainEntity;
      const entity = context?.ontology?.entities?.[entityName];
      if (!entity?.fields?.tags || !entity?.fields?.policies) return slots;

      const has = (key) => slots.body.columns.some(c => c.key === key);
      const additions = [];

      if (!has("tags")) additions.push({
        key: "tags",
        label: "Tags",
        kind: "chipAssociation",
        associateLabel: "+ Associate Tag",
        intentOnAssociate: "associateTags",
        variant: "tag",
      });
      if (!has("policies")) additions.push({
        key: "policies",
        label: "Policies",
        kind: "chipAssociation",
        associateLabel: "+ Associate Policy",
        intentOnAssociate: "associatePoliciesForObject",
        variant: "policy",
      });
      if (additions.length === 0) return slots;

      const cols = [...slots.body.columns];
      const nameIdx = cols.findIndex(c => c.key === "name");
      const insertAt = nameIdx >= 0 ? nameIdx + 1 : cols.length;
      cols.splice(insertAt, 0, ...additions);

      return { ...slots, body: { ...slots.body, columns: cols } };
    },
  },
  rationale: {
    hypothesis:
      "Govern by tags/policies — visible inline в catalog rows. Author не пишет " +
      "column-config вручную, declarative ontology с tags/policies полями достаточно.",
    evidence: [
      { source: "Apache Gravitino v2 WebUI", description: "Tags + Policies column'ы инлайн в Catalog/Schema/Table list", reliability: "high" },
      { source: "GitHub labels", description: "Labels column в issues-list", reliability: "high" },
      { source: "Jira labels", description: "Labels column inline в issues table", reliability: "medium" },
    ],
    counterexample: [
      { source: "feed без taxonomy", description: "Messenger conversations — нет tags/policies fields", reliability: "high" },
      { source: "image gallery", description: "Listings без governance polish — visual-rich grid-card", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "gravitino", projection: "catalog_list", reason: "Catalog имеет tags + policies fields в ontology" },
      { domain: "gravitino", projection: "table_list",   reason: "Table — tags + policies для column-level governance" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "conversations_feed", reason: "Conversation без tags/policies полей" },
      { domain: "invest",    projection: "portfolios_root",     reason: "Portfolio не имеет policies полей" },
    ],
  },
};

export default PATTERN;
