/**
 * catalog-exclude-self-owned (§6.6).
 *
 * Публичные catalog'и (marketplace listings, freelance task-board)
 * не должны содержать собственные объекты viewer'а. Executor видит
 * чужие задачи; buyer видит чужие товары. Раньше автор вручную писал
 * `filter: "item.ownerId !== viewer.id"`.
 *
 * Pattern детектирует: у mainEntity есть ownerField (или owners[]),
 * projection — catalog, нет явного author-overlapping фильтра. Инжектит
 * декларативный маркер `body.excludeSelfOwned = { field, extra? }`
 * который рендерер применяет поверх projection.filter.
 *
 * Author-override: если projection.excludeSelfOwned === false явно
 * выставлен — pattern no-op. Это покрывает кейс "мои объекты" view'ы.
 */

function getOwnerFields(ontology, mainEntity) {
  const def = ontology?.entities?.[mainEntity];
  if (!def) return [];
  if (Array.isArray(def.owners) && def.owners.length > 0) return def.owners.slice();
  if (typeof def.ownerField === "string") return [def.ownerField];
  return [];
}

export default {
  id: "catalog-exclude-self-owned",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      if (projection?.kind !== "catalog") return false;
      if (projection?.excludeSelfOwned === false) return false;
      const owners = getOwnerFields(ontology, projection?.mainEntity);
      return owners.length > 0;
    },
  },
  structure: {
    slot: "body",
    description:
      "Public catalog'и с ownerField автоматически исключают " +
      "own item'ы viewer'а из выдачи. Рендерер применяет " +
      "body.excludeSelfOwned поверх projection.filter.",
    /**
     * Apply: выставляет `body.excludeSelfOwned = { field, owners }`.
     * Если автор уже задал `body.excludeSelfOwned` (или explicit false) —
     * не трогаем. `projection.excludeSelfOwned === false` блокирует на
     * уровне matcher'а.
     */
    apply(slots, context) {
      const { projection, ontology } = context || {};
      const body = slots?.body || {};
      if (body.excludeSelfOwned !== undefined) return slots;
      const owners = getOwnerFields(ontology, projection?.mainEntity);
      if (!owners.length) return slots;
      return {
        ...slots,
        body: {
          ...body,
          excludeSelfOwned: owners.length === 1
            ? { field: owners[0] }
            : { fields: owners },
        },
      };
    },
  },
  rationale: {
    hypothesis:
      "В public marketplace-каталоге собственные объекты viewer'а — " +
      "шум: их уже видно в \"моих\". Автоматическая инверсия ownership " +
      "снимает частый ручной фильтр.",
    evidence: [
      { source: "avito",    description: "Feed объявлений без своих",    reliability: "high" },
      { source: "upwork",   description: "Public job-feed без own-posted", reliability: "high" },
      { source: "ebay",     description: "Listings exclude own-bids-seller",    reliability: "high" },
      { source: "fl.ru",    description: "Проекты: фрилансер не видит свои",  reliability: "medium" },
    ],
    counterexample: [
      { source: "my-orders", description: "\"Мои заказы\" — явно нужен self-view (excludeSelfOwned: false)", reliability: "high" },
      { source: "watchlist", description: "Избранное — сохранённые ids, нет ownership-концепта", reliability: "medium" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales", projection: "listing_feed",
        reason: "Listing.ownerField=\"sellerId\" + public catalog" },
      { domain: "freelance", projection: "tasks_board",
        reason: "Task.ownerField=\"customerId\" + public catalog (для executor-view)" },
    ],
    shouldNotMatch: [
      { domain: "lifequest", projection: "my_goals",
        reason: "Personal view — excludeSelfOwned:false" },
      { domain: "messenger", projection: "my_conversations",
        reason: "Нет ownerField у Conversation в catalog-контексте" },
    ],
  },
};
