/**
 * metadata-objects-reverse-lookup — derived collection synthesis.
 * Когда projection.subCollections.source = "derived:metadata-objects-by-tag"
 * (или :by-policy) — pattern apply сканирует
 * world.{catalogs|schemas|tables|filesets|topics|models} и собирает items
 * где entity.tags|.policies includes target name (route param).
 *
 * Generalized — domain-agnostic, но shape оптимизирован под Gravitino-style
 * metadata layer (catalog → schema → table FK chain). Phase 3 host'ы
 * откажутся от ручных reverse-scan loops в проекциях tag/policy detail.
 *
 * U-derive Phase 2 (gravitino-driven).
 */

const ENTITY_KINDS = [
  { collection: "catalogs", entityType: "catalog", parent: () => null },
  {
    collection: "schemas",
    entityType: "schema",
    parent: (s, w) => (w.catalogs || []).find(c => c.id === s.catalogId)?.name || null,
  },
  {
    collection: "tables",
    entityType: "table",
    parent: (t, w) => {
      const sch = (w.schemas || []).find(s => s.id === t.schemaId);
      if (!sch) return null;
      const cat = (w.catalogs || []).find(c => c.id === sch.catalogId);
      return cat ? `${cat.name}.${sch.name}` : sch.name;
    },
  },
  {
    collection: "filesets",
    entityType: "fileset",
    parent: (f, w) => {
      const sch = (w.schemas || []).find(s => s.id === f.schemaId);
      if (!sch) return null;
      const cat = (w.catalogs || []).find(c => c.id === sch.catalogId);
      return cat ? `${cat.name}.${sch.name}` : sch.name;
    },
  },
  {
    collection: "topics",
    entityType: "topic",
    parent: (t, w) => (w.catalogs || []).find(c => c.id === t.catalogId)?.name || null,
  },
  {
    collection: "models",
    entityType: "model",
    parent: (m, w) => {
      const sch = (w.schemas || []).find(s => s.id === m.schemaId);
      if (!sch) return null;
      const cat = (w.catalogs || []).find(c => c.id === sch.catalogId);
      return cat ? `${cat.name}.${sch.name}` : sch.name;
    },
  },
];

function fullName(item, parentPath) {
  return parentPath ? `${parentPath}.${item.name}` : item.name;
}

/**
 * Сканирует world по всем metadata-сущностям и возвращает entries
 * где entity[field] includes targetName.
 *
 * @param {object} world         — full world snapshot.
 * @param {"tag"|"policy"} kind  — filter направление.
 * @param {string} name          — tag/policy name (route param).
 * @returns {Array<{entityType, collectionKey, entity, fullName}>}
 */
export function scanMetadataObjects(world, kind, name) {
  const field = kind === "tag" ? "tags" : "policies";
  const out = [];
  for (const k of ENTITY_KINDS) {
    const items = world[k.collection] || [];
    for (const it of items) {
      if ((it[field] || []).includes(name)) {
        const parent = k.parent(it, world);
        out.push({
          entityType: k.entityType,
          collectionKey: k.collection,
          entity: it,
          fullName: fullName(it, parent),
        });
      }
    }
  }
  return out;
}

export const PATTERN = {
  id: "metadata-objects-reverse-lookup",
  version: 1,
  status: "stable",
  archetype: null,
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      const subs = projection?.subCollections;
      if (!Array.isArray(subs)) return false;
      return subs.some(s =>
        typeof s?.source === "string" &&
        /^derived:metadata-objects-by-(tag|policy)$/.test(s.source),
      );
    },
  },
  structure: {
    slot: "subCollections",
    description:
      "Populates subCollections.items для тех subs, у которых source = " +
      "'derived:metadata-objects-by-tag' или 'derived:metadata-objects-by-policy'. " +
      "Scan'ит world.{catalogs,schemas,tables,filesets,topics,models} и собирает " +
      "entries { entityType, collectionKey, entity, fullName } где entity.tags|.policies " +
      "includes target name (route param).",
    apply(slots, context) {
      const subs = slots?.subCollections;
      if (!Array.isArray(subs)) return slots;
      const world = context?.world;
      const routeParams = context?.routeParams || {};
      if (!world) return slots;

      let mutated = false;
      const newSubs = subs.map(sub => {
        if (typeof sub?.source !== "string") return sub;
        const m = sub.source.match(/^derived:metadata-objects-by-(tag|policy)$/);
        if (!m) return sub;
        const kind = m[1];
        const targetName = routeParams[sub.param || (kind === "tag" ? "tagName" : "policyName")];
        if (!targetName) return sub;
        const items = scanMetadataObjects(world, kind, targetName);
        mutated = true;
        return { ...sub, items };
      });
      if (!mutated) return slots;
      return { ...slots, subCollections: newSubs };
    },
  },
  rationale: {
    hypothesis:
      "Tag/policy detail должен показать все ассоциированные metadata objects " +
      "(reverse association). Scan через все entity kinds — generalized " +
      "domain-agnostic паттерн, заменяет manual loops в projection authoring.",
    evidence: [
      { source: "Apache Gravitino v2 WebUI", description: "Tag/Policy detail page показывает Associated Objects table — catalogs/schemas/tables", reliability: "high" },
      { source: "GitHub label detail", description: "Issues with this label — reverse-scan", reliability: "high" },
      { source: "Jira label browse", description: "Issues by label", reliability: "medium" },
    ],
    counterexample: [
      { source: "static catalog", description: "Tag без backreferences — no reverse scan", reliability: "medium" },
      { source: "messenger", description: "Conversations не taxonomy-organized", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "gravitino", projection: "tag_detail",    reason: "subCollections с source=derived:metadata-objects-by-tag" },
      { domain: "gravitino", projection: "policy_detail", reason: "subCollections с source=derived:metadata-objects-by-policy" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "conversations_feed", reason: "Нет subCollections" },
      { domain: "invest",    projection: "portfolios_root",     reason: "subCollections без derived:* source" },
    ],
  },
};

export default PATTERN;
