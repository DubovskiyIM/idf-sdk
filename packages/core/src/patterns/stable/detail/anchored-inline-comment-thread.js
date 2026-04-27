/**
 * anchored-inline-comment-thread — promote из candidate (idf §13.17 opt-a demo).
 *
 * Comment sub-entity с FK на mainEntity, имеющий `anchorRange` field
 * (любой optional pointer в body) и `resolved` boolean — рендерится в
 * **двух плоскостях**: anchored thread (highlight + side-rail bubble)
 * и unanchored aggregate (footer-секция «Page comments»).
 *
 * Без apply'я subCollection-фолбэк дал бы один flat list — потерялась
 * бы привязка к фрагменту контента.
 *
 * Сигнал: Confluence inline-comments, Google Docs side-rail bubbles,
 * Notion inline thread, Figma comment-pins.
 *
 * Source candidate: refs/candidates-with-apply/2026-04-26-confluence-
 * space-wiki-anchored-inline-comment-thread.json
 */

const ANCHOR_FIELD_NAMES = new Set([
  "anchorrange",
  "anchor",
  "anchorpath",
  "anchorid",
  "rangeref",
  "selectionref",
]);

function findCommentLikeEntity(ontology, mainEntity) {
  if (!ontology?.entities || !mainEntity) return null;
  const mainLower = mainEntity.toLowerCase();
  const fkPattern = `${mainLower}id`;

  for (const [entityName, entity] of Object.entries(ontology.entities)) {
    const fields = entity?.fields || {};

    // FK на mainEntity (прямой, не sparse XOR)
    const hasFkToMain = Object.entries(fields).some(([fname, fdef]) => {
      if (fname.toLowerCase() !== fkPattern) return false;
      return fdef?.type === "entityRef" || fdef?.type === "id";
    });
    if (!hasFkToMain) continue;

    // anchorRange-like field — любое из ANCHOR_FIELD_NAMES
    const anchorField = Object.keys(fields).find((f) =>
      ANCHOR_FIELD_NAMES.has(f.toLowerCase()),
    );
    if (!anchorField) continue;

    // resolved boolean
    const resolvedField = Object.entries(fields).find(([fname, fdef]) => {
      if (fname.toLowerCase() !== "resolved") return false;
      return fdef?.type === "boolean";
    });
    if (!resolvedField) continue;

    // kind discriminator (optional но усиливает match)
    const kindField = fields.kind?.options?.length >= 2 ? "kind" : null;

    return {
      entity: entityName,
      fkField: `${mainLower}Id`,
      anchorField,
      resolvedField: resolvedField[0],
      kindField,
    };
  }
  return null;
}

function buildOverlayEntries(commentMeta, patternId) {
  return [
    // Anchored thread — highlight в body + side-rail bubble
    {
      key: `inline-comment-anchored__${commentMeta.entity.toLowerCase()}`,
      type: "inlineCommentThread",
      entity: commentMeta.entity,
      foreignKey: commentMeta.fkField,
      anchorField: commentMeta.anchorField,
      resolvedField: commentMeta.resolvedField,
      kindField: commentMeta.kindField,
      band: "anchored",
      where: `row.${commentMeta.anchorField} != null`,
      visualHints: {
        position: "side-rail",
        anchorMode: "highlight",
        resolvedToggle: { collapse: true, keepPin: true },
      },
      source: `derived:${patternId}`,
    },
    // Unanchored — footer-секция
    {
      key: `inline-comment-unanchored__${commentMeta.entity.toLowerCase()}`,
      type: "subCollectionRef",
      entity: commentMeta.entity,
      foreignKey: commentMeta.fkField,
      where: `row.${commentMeta.anchorField} == null`,
      slot: "footer",
      sectionLabel: "Page comments",
      source: `derived:${patternId}`,
    },
  ];
}

const PATTERN_ID = "anchored-inline-comment-thread";

export default {
  id: PATTERN_ID,
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "sub-entity-exists", name: "Comment", fkTo: "mainEntity", shape: "thread" },
      { kind: "entity-field", entity: "Comment", field: "anchorRange", shape: "optional-range-ref" },
      { kind: "entity-field", entity: "Comment", field: "resolved", shape: "boolean" },
    ],
    match(intents, ontology, projection) {
      if (!projection?.mainEntity) return false;
      return findCommentLikeEntity(ontology, projection.mainEntity) !== null;
    },
  },
  structure: {
    slot: "overlay",
    description:
      "Comment с anchorRange рендерится как highlight в body на anchor'е плюс side-rail thread bubble выровненный по anchor'у; resolved=true сворачивает rail, оставляя pin-маркер. Comment без anchorRange агрегируются в footer-секцию.",
    /**
     * Apply: detect Comment-like entity (FK + anchorRange + resolved),
     * добавить в `slots.overlay` две band'ы (anchored / unanchored).
     * Идемпотентно через stable `key` поля.
     *
     * Author-override (§16): existing overlay entries с совпадающим
     * key не перезаписываются.
     */
    apply(slots, context) {
      const { ontology, mainEntity } = context || {};
      if (!ontology?.entities || !mainEntity) return slots;

      const commentMeta = findCommentLikeEntity(ontology, mainEntity);
      if (!commentMeta) return slots;

      const overlay = Array.isArray(slots?.overlay) ? slots.overlay : [];
      const existingKeys = new Set(overlay.map((o) => o?.key).filter(Boolean));

      const toAdd = buildOverlayEntries(commentMeta, PATTERN_ID).filter(
        (entry) => !existingKeys.has(entry.key),
      );
      if (toAdd.length === 0) return slots;

      return {
        ...slots,
        overlay: [...overlay, ...toAdd],
      };
    },
  },
  rationale: {
    hypothesis:
      "Inline-comment с anchor имеет фундаментально другую UX-модель чем page-comment: он привязан к фрагменту контента и должен оставаться визуально рядом с этим фрагментом. Generic subCollection-list проиграет всю информацию якоря и спрячет thread в footer'е. Anchored vs unanchored — discriminator, который требует двух разных слотов рендеринга одной entity.",
    evidence: [
      {
        source: "confluence",
        description:
          "Inline comments — yellow highlight в тексте + side-rail с thread; page comments — отдельная секция внизу",
        reliability: "high",
      },
      {
        source: "google-docs",
        description:
          "Comment с anchor → side-rail bubble; resolved → исчезает из rail, остаётся в History",
        reliability: "high",
      },
      {
        source: "notion",
        description: "Inline comments на selection с side-rail и resolve-toggle",
        reliability: "high",
      },
      {
        source: "figma",
        description: "Comment-pins на coordinate в canvas — анализ-эквивалент anchorRange",
        reliability: "medium",
      },
    ],
    counterexample: [
      {
        source: "messenger",
        description:
          "Message comments — линейный thread без anchor в body, обычный composer-entry достаточен",
        reliability: "high",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      {
        domain: "confluence-space-wiki",
        projection: "page_detail",
        reason: "Comment с anchorRange + kind discriminator + resolved",
      },
    ],
    shouldNotMatch: [
      {
        domain: "messenger",
        projection: "conversation_detail",
        reason: "Message не имеет anchor в parent body",
      },
      {
        domain: "sales",
        projection: "listing_detail",
        reason: "Q&A — flat thread, нет anchor в текст листинга",
      },
      {
        domain: "delivery",
        projection: "order_detail",
        reason: "Comment-on-order — flat note без anchorRange",
      },
    ],
  },
};
