export default {
  id: "discriminator-wizard",
  version: 1,
  status: "stable",
  archetype: "catalog",
  trigger: {
    requires: [
      { kind: "intent-creates", entity: "$mainEntity" },
    ],
    match(intents, ontology, projection) {
      // Entity имеет discriminator field (type/provider/kind) с ≥2 options
      // + intent creates этой entity
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity?.fields || typeof entity.fields !== "object") return false;

      const discriminatorNames = ["type", "provider", "kind", "category"];
      for (const dName of discriminatorNames) {
        const field = entity.fields[dName];
        if (field && field.type === "select" && (field.options?.length || 0) >= 2) {
          return true;
        }
      }
      return false;
    },
  },
  structure: {
    slot: "overlay",
    description: "Multi-step wizard: шаг 1 — выбор discriminator (type/provider), шаг 2+ — динамическая форма с полями, зависящими от варианта.",
  },
  rationale: {
    hypothesis: "Когда entity имеет discriminator с разными наборами required полей, wizard разделяет решение от заполнения, снижая когнитивную нагрузку.",
    evidence: [
      { source: "gravitino-webui", description: "Create Catalog: type → provider → provider-specific fields", reliability: "high" },
      { source: "stripe-dashboard", description: "Create payment method: тип → поля под тип", reliability: "medium" },
    ],
    counterexample: [
      { source: "booking-create", description: "Простая форма без discriminator — wizard избыточен", reliability: "high" },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "sales", projection: "listing_feed", reason: "Listing.type есть неявно (auction vs fixed price)" },
    ],
    shouldNotMatch: [
      { domain: "planning", projection: "my_polls", reason: "Poll нет discriminator field с ≥2 select options" },
    ],
  },
};
