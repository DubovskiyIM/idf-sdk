export default {
  id: "grid-card-layout",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [],
    match(intents, ontology, projection) {
      const mainEntity = projection?.mainEntity;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity?.fields || typeof entity.fields !== "object") return false;

      // Trigger 1: entity имеет image/heroImage поле
      for (const [, def] of Object.entries(entity.fields)) {
        if (def?.type === "image" || def?.type === "multiImage") return true;
      }

      // Trigger 2: ≥3 metric/money полей (визуально плотная карточка)
      let metricCount = 0;
      for (const [, def] of Object.entries(entity.fields)) {
        if (def?.fieldRole === "money" || def?.fieldRole === "percentage" || def?.fieldRole === "trend") {
          metricCount++;
        }
      }
      return metricCount >= 3;
    },
  },
  structure: {
    slot: "body",
    description: "Grid layout с visual-rich карточками. Для entities с image — grid с preview. Для ≥3 metrics — KPI cards.",
  },
  rationale: {
    hypothesis: "Визуально плотные entities лучше сканируются в grid чем в list",
    evidence: [
      { source: "airbnb", description: "Listing grid: image + price + rating", reliability: "high" },
      { source: "stripe-dashboard", description: "KPI cards grid", reliability: "high" },
    ],
    counterexample: [
      { source: "gmail", description: "Email: нет images/metrics → list лучше grid", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "invest", projection: "portfolios_root", reason: "Portfolio: money(totalValue) + money(pnl) + percentage(targetStocks) = 3 metrics" },
      { domain: "sales", projection: "listing_feed", reason: "Listing: images(multiImage)" },
    ],
    shouldNotMatch: [
      { domain: "planning", projection: "my_polls", reason: "Poll: нет image, мало metrics" },
    ],
  },
};
