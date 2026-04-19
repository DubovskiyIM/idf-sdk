/**
 * paid-visibility-elevation (stable, catalog). Merge-промоция из 4 кандидатов:
 *   - promoted-slot-injection (profi-ru)    — sponsored slots с badge
 *   - paid-visibility-elevation (fl.ru)      — isPromoted + visual uplift
 *   - highlight-important-flag (workzilla)   — boolean importance / Super-task
 *   - emphasis-priority-card (fl.ru)         — Проект дня / featured
 *
 * Общая семантика: catalog с полем «эта карточка — выделена» (paid
 * promotion / editorial featured / user emphasis). Визуально отделяется
 * от органической выдачи, опционально группируется в верхнюю полосу.
 *
 * Trigger: у mainEntity есть поле из elevation-whitelist (isPromoted,
 * isSponsored, isFeatured, promoted, sponsored, featured, isSuper,
 * isPriority, priority) — boolean или enum.
 *
 * Apply: `body.cardSpec.elevation = { field, variant, placement }`.
 *   - `field`: имя поля-флага
 *   - `variant`: "boolean" | "enum"
 *   - `placement`: "strip" (отдельная полоса сверху) | "inline" (бейдж в карточке)
 *
 * Рендерер получает declarative-маркер и реализует визуал (bleed, badge,
 * pinning) в стиле своего UI-kit.
 */

const ELEVATION_FIELD_NAMES = new Set([
  "isPromoted", "isSponsored", "isFeatured",
  "promoted", "sponsored", "featured",
  "isSuper", "isPriority", "priority",
  "isHighlight", "highlighted",
]);

const ELEVATION_ENUM_VALUES = new Set([
  "featured", "promoted", "sponsored", "premium", "top",
  "highlighted", "pinned",
]);

function detectElevationField(entityDef) {
  const fields = entityDef?.fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return null;
  for (const [name, def] of Object.entries(fields)) {
    if (ELEVATION_FIELD_NAMES.has(name)) {
      return { field: name, variant: def?.type === "boolean" ? "boolean" : "enum" };
    }
    if (Array.isArray(def?.options)) {
      const hit = def.options.some(v =>
        typeof v === "string" && ELEVATION_ENUM_VALUES.has(v.toLowerCase()),
      );
      if (hit) return { field: name, variant: "enum" };
    }
  }
  return null;
}

export default {
  id: "paid-visibility-elevation",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      if (projection?.kind !== "catalog") return false;
      if (projection?.elevation === false) return false;
      const entity = ontology?.entities?.[projection?.mainEntity];
      return detectElevationField(entity) != null;
    },
  },
  structure: {
    slot: "body",
    description:
      "Elevation-маркер в body.cardSpec.elevation. Author может " +
      "задать projection.elevationPlacement ∈ \"strip\" | \"inline\" " +
      "(default: \"strip\" — отдельная полоса над основной лентой).",
    apply(slots, context) {
      const { projection, ontology } = context || {};
      const entity = ontology?.entities?.[projection?.mainEntity];
      const detected = detectElevationField(entity);
      if (!detected) return slots;
      const body = slots?.body || {};
      const cardSpec = body.cardSpec || {};
      if (cardSpec.elevation) return slots;
      const placement = projection?.elevationPlacement || "strip";
      return {
        ...slots,
        body: {
          ...body,
          cardSpec: {
            ...cardSpec,
            elevation: {
              field: detected.field,
              variant: detected.variant,
              placement,
            },
          },
        },
      };
    },
  },
  rationale: {
    hypothesis:
      "Monetized visibility boost должен быть визуально дифференцирован " +
      "от органической выдачи — иначе unfair-advantage неочевиден " +
      "читателю, и trust к ranking'у падает. Naive highlight (bold/colored " +
      "border) читается как декор.",
    evidence: [
      { source: "profi.ru",   description: "TOP-слоты 2-4 шт с badge над органикой", reliability: "high" },
      { source: "fl.ru",      description: "Проект дня — bleed-фон + звезда, отдельно", reliability: "high" },
      { source: "workzilla",  description: "Super-task — жёлтый фон + иконка",        reliability: "high" },
      { source: "amazon",     description: "Sponsored — отдельный badge над листингом", reliability: "high" },
      { source: "google",     description: "Ads — visually separated slot с \"Ad\" меткой", reliability: "high" },
    ],
    counterexample: [
      { source: "wikipedia",  description: "Featured article без paid-ligic — editorial only", reliability: "medium" },
    ],
    mergeSources: [
      "candidate/bank/2026-04-19-profi-ru-catalog-promoted-slot-injection.json",
      "candidate/bank/2026-04-19-fl-ru-projects-board-paid-visibility-elevation.json",
      "candidate/bank/2026-04-19-workzilla-marketplace-highlight-important-flag.json",
      "candidate/bank/2026-04-19-fl-ru-projects-board-emphasis-priority-card.json",
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales",     projection: "listings_feed",
        reason: "Listing.isPromoted boolean + catalog" },
      { domain: "freelance", projection: "tasks_board",
        reason: "Task.isSuper / Task.priority" },
    ],
    shouldNotMatch: [
      { domain: "messenger", projection: "conversations",
        reason: "нет elevation-field у Conversation" },
      { domain: "lifequest", projection: "goal_detail",
        reason: "detail, не catalog" },
    ],
  },
};
