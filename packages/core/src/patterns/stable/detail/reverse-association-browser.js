/**
 * reverse-association-browser — обратный обход m2m-связи на detail
 * reference-entity. Отвечает на вопрос «кто ссылается на этот справочник».
 *
 * На detail-странице reference-сущности (Tag, Policy, Category, Asset)
 * добавляется секция «кто меня использует»: список объектов с FK на mainEntity,
 * сгруппированный по discriminator-полю junction'а (если есть), с клик-в-detail
 * на исходную сущность.
 *
 * Отличается от m2m-attach-dialog: там attach через modal из parent→child,
 * здесь read-only обзор обратной стороны связи на reference-detail.
 * Subcollections/footer-inline-setter не применяются к reference-mainEntity
 * (там нет author-flow), поэтому reverse-browser — натуральный апдейт.
 *
 * Сигнал: Apache Gravitino (Tag.detail → Metadata Objects with Tag),
 * GitHub label.detail → issues list, Stripe product.detail → subscriptions.
 */

function pluralizeCollection(entity) {
  if (!entity) return "";
  const first = entity.charAt(0).toLowerCase();
  const rest = entity.slice(1);
  const base = first + rest;
  if (/[sxz]$/.test(base) || /(ch|sh)$/.test(base)) return base + "es";
  return base + "s";
}

function collectionKeyFor(entity, ontology) {
  const entityDef = ontology?.entities?.[entity];
  if (typeof entityDef?.collection === "string") return entityDef.collection;
  return pluralizeCollection(entity);
}

function findReverseReferrers(ontology, mainEntity) {
  if (!ontology?.entities || !mainEntity) return [];
  const mainLower = mainEntity.toLowerCase();
  const expectedFk = `${mainLower}id`;
  const referrers = [];

  for (const [entityName, entity] of Object.entries(ontology.entities)) {
    if (entityName === mainEntity) continue;
    if (entity?.kind === "reference") continue; // reference-to-reference не браузим

    const fields = entity.fields || {};
    const fkField = Object.keys(fields).find(f => {
      if (f.toLowerCase() !== expectedFk) return false;
      const def = fields[f];
      return def?.type === "entityRef" || def?.type === "id";
    });
    if (!fkField) continue;

    // Discriminator-поле — polymorphic junction (objectType, kind, entityType)
    const discriminatorField = Object.keys(fields).find(f =>
      /^(objectType|entityType|targetType|resourceType|refType|kind)$/i.test(f) &&
      fields[f]?.options,
    );

    referrers.push({
      entity: entityName,
      fkField,
      discriminatorField: discriminatorField || null,
      isAssignment: entity?.kind === "assignment",
    });
  }
  return referrers;
}

export default {
  id: "reverse-association-browser",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "entity-kind", entityKind: "reference" },
    ],
    match(intents, ontology, projection) {
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;
      // Дублируем entity-kind check для robustness — match() может быть вызван
      // напрямую (тесты, explainMatch) в обход requires-eval.
      if (ontology?.entities?.[mainEntity]?.kind !== "reference") return false;
      const referrers = findReverseReferrers(ontology, mainEntity);
      return referrers.length > 0;
    },
  },
  structure: {
    slot: "sections",
    description:
      "На detail reference-сущности секция «Кто использует» со списком сущностей, " +
      "ссылающихся по FK. Если у referrer'а есть discriminator-поле (objectType, kind), " +
      "список группируется по нему. Клик в row — навигация в detail исходной сущности.",
    /**
     * Apply: для mainEntity с entity.kind="reference" находит все entities с FK
     * на mainEntity и добавляет по секции `reverseM2mBrowse` на каждую. Если
     * referrer имеет discriminator-поле (objectType / kind / entityType) —
     * groupBy выставляется в эту сторону, иначе flat-list.
     *
     * Idempotent: existing section с тем же id не перезаписывается.
     * Author-override: если projection.subCollections заданы автором —
     * apply пропускается (автор управляет вручную).
     */
    apply(slots, context) {
      const { ontology, mainEntity, projection } = context || {};
      if (!mainEntity || !ontology?.entities) return slots;
      if (Array.isArray(projection?.subCollections) && projection.subCollections.length > 0) {
        return slots;
      }
      const entity = ontology.entities[mainEntity];
      if (entity?.kind !== "reference") return slots;

      const referrers = findReverseReferrers(ontology, mainEntity);
      if (referrers.length === 0) return slots;

      const existing = slots?.sections || [];
      const existingIds = new Set(existing.map(s => s?.id).filter(Boolean));

      const newSections = referrers
        .map(r => ({
          id: `reverse_ref_${r.entity.toLowerCase()}`,
          title: `Использование (${r.entity})`,
          kind: "reverseM2mBrowse",
          entity: r.entity,
          itemEntity: r.entity,
          foreignKey: r.fkField,
          collection: collectionKeyFor(r.entity, ontology),
          groupBy: r.discriminatorField,
          readOnly: !r.isAssignment,
          // Witness-источник для overlay (PatternPreviewOverlay читает section.source).
          // Collection-key для SubCollectionSection живёт в `collection` — там
          // fallback с derived: source на `collection` / `itemEntity`.
          source: "derived:reverse-association-browser",
        }))
        .filter(s => !existingIds.has(s.id));

      if (newSections.length === 0) return slots;

      return {
        ...slots,
        sections: [...existing, ...newSections],
      };
    },
  },
  rationale: {
    hypothesis:
      "M2M/FK-связь доступна в двух направлениях, но UI обычно показывает только одно " +
      "(child→parent). Для reference-entity (справочники, метки) governance/audit-вопросы " +
      "идут в обратную сторону: «где этот tag используется», «какие портфели держат этот asset». " +
      "Reverse-browser закрывает вторую половину без отдельной query-UI.",
    evidence: [
      { source: "gravitino-webui", description: "Tag.detail → Metadata Objects with Tag (grouped by objectType)", reliability: "high" },
      { source: "github-labels", description: "Label detail → issues list", reliability: "high" },
      { source: "idf-invest", description: "Asset.detail → Position-список с этим asset'ом", reliability: "medium" },
    ],
    counterexample: [
      { source: "user-profile", description: "User не reference — reverse-obзор неприменим", reliability: "high" },
      { source: "session", description: "Ephemeral entity без reverse-query значения", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "invest", projection: "asset_detail", reason: "Asset kind:reference + Position.assetId — показать держателей" },
    ],
    shouldNotMatch: [
      { domain: "planning", projection: "poll_overview", reason: "Poll не reference-entity" },
      { domain: "messenger", projection: "conversation_detail", reason: "Conversation не reference" },
    ],
  },
};
