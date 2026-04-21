/**
 * catalog-action-cta — per-item action-buttons для replace-intent'ов
 * с target=mainEntity, ограниченные permittedFor + ownership condition.
 *
 * Контракт findings §8.1 / backlog Workzilla P0-1: каталог, в котором
 * есть per-item mutation-intents (editTask / publishTask / withdrawResponse),
 * должен показывать action-кнопку рядом с каждой карточкой. SDK через
 * `assignToSlotsCatalog::isPerItemIntent` + `addItemIntent` уже кладёт
 * такие intent'ы в `body.item.intents`. Этот pattern — формальная мета-
 * метка для X-ray + guard, что контракт соблюдается.
 *
 * Pattern matching-only по дизайну: routing уже выполнен в catalog-ветви.
 * Apply добавляет `source: "derived:catalog-action-cta"` на матчевшие
 * intent'ы, чтобы prototype `PatternInspector` / studio X-ray показывал,
 * откуда они взялись.
 */

function countActionCandidates(intents, ontology, projection) {
  const mainEntity = projection?.mainEntity;
  if (!mainEntity) return 0;
  const lower = mainEntity.toLowerCase();
  let count = 0;
  for (const intent of intents) {
    if (!intent) continue;
    const effects = intent?.particles?.effects || [];
    const mutatesMain = effects.some(e =>
      (e.α === "replace" || e.α === "remove") &&
      typeof e.target === "string" &&
      (e.target === lower || e.target.startsWith(lower + "."))
    );
    if (!mutatesMain) continue;
    // Creator-intent'ы (α:add) — не candidate (уходят в hero/toolbar).
    // Filter uniqueness by id — но intent уже уникален в итерации.
    count += 1;
  }
  return count;
}

export default {
  id: "catalog-action-cta",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "intent-count", α: "replace", min: 1 },
    ],
    match(intents, ontology, projection) {
      return countActionCandidates(intents, ontology, projection) >= 1;
    },
  },
  structure: {
    slot: "body.item.intents",
    description:
      "Replace-intent'ы mainEntity (editX / publishX / withdrawX) появляются как trailing action-кнопки на каждой карточке каталога. Role-guard через ownership condition (ownerField === viewer.id).",
    /**
     * Apply: тагирует уже-роутёных item.intents `source:"derived:catalog-action-cta"`
     * для X-ray inspection. Не изменяет список (pattern — matching/metadata),
     * только делает routing прослеживаемым.
     *
     * Идемпотентно: существующий `source` не перезаписывается.
     */
    apply(slots, context) {
      const body = slots?.body;
      const item = body?.item;
      const intents = item?.intents;
      if (!Array.isArray(intents) || intents.length === 0) return slots;
      const needsTag = intents.some(i => i && !i.source);
      if (!needsTag) return slots;
      const tagged = intents.map(i =>
        i && !i.source ? { ...i, source: "derived:catalog-action-cta" } : i,
      );
      return {
        ...slots,
        body: {
          ...body,
          item: { ...item, intents: tagged },
        },
      };
    },
  },
  rationale: {
    hypothesis:
      "Actionable каталоги (задачи, отклики, сделки) требуют быстрого доступа к replace-actions без открытия detail. " +
      "Trailing action-button на item-карточке — конвергентный UX-паттерн в task-менеджерах (Linear, Height, Notion) и freelance-биржах (Upwork, Workzilla).",
    evidence: [
      { source: "workzilla.ru", description: "Список откликов: «Отозвать» trailing-кнопка на каждой карточке", reliability: "high" },
      { source: "linear", description: "Issue list: inline status pill кликабельна, assign/priority через hover-buttons", reliability: "high" },
      { source: "height.app", description: "Task list: inline drag + quick-actions без открытия detail", reliability: "high" },
    ],
    counterexample: [
      { source: "airbnb-listings", description: "Каталог публичный, read-only для viewer'а — per-item actions не применимы", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "freelance", projection: "my_deals", reason: "editDeal, confirmDeal, cancelDeal — replace на Deal" },
      { domain: "workzilla", projection: "task_list", reason: "editTask, publishTask — customer replace на Task" },
    ],
    shouldNotMatch: [
      { domain: "sales", projection: "listing_feed", reason: "Public catalog без per-item mutation (только bid — creates отдельной сущности)" },
    ],
  },
};
