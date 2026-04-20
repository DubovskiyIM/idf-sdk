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
    /**
     * Apply: находит discriminator field + create-intent, emit'ит
     * metadata в `slots._wizardCandidates`. Renderer использует эту
     * подсказку для замены обычной form modal на multi-step wizard —
     * step 1 выбор variant'а, step 2+ поля под variant.
     *
     * Minimal scope: metadata only. Полный wizard UI — future renderer
     * primitive, интегрированный с FormModal.
     *
     * Shape:
     *   slots._wizardCandidates = [{
     *     discriminatorField: "type",
     *     variants: ["hive", "iceberg", "kafka"],
     *     creatorIntentId: "create_catalog",
     *     source: "derived:discriminator-wizard",
     *   }]
     *
     * Idempotent: existing `slots._wizardCandidates` → no-op.
     */
    apply(slots, context) {
      const { ontology, mainEntity, intents } = context || {};
      if (!mainEntity || !ontology?.entities) return slots;
      const entity = ontology.entities[mainEntity];
      if (!entity?.fields || typeof entity.fields !== "object") return slots;

      const discriminatorNames = ["type", "provider", "kind", "category"];
      let discriminatorField = null;
      let variants = null;
      for (const dName of discriminatorNames) {
        const field = entity.fields[dName];
        if (!field || field.type !== "select") continue;
        const opts = Array.isArray(field.options) ? field.options : [];
        if (opts.length < 2) continue;
        discriminatorField = dName;
        variants = opts.map(o => (typeof o === "string" ? o : (o.value ?? o.id)));
        break;
      }
      if (!discriminatorField) return slots;

      const creatorIntent = (intents || []).find(i => {
        if (typeof i.creates !== "string") return false;
        const base = i.creates.replace(/\(.*\)$/, "").trim();
        return base === mainEntity;
      });
      if (!creatorIntent) return slots;

      if (Array.isArray(slots?._wizardCandidates) && slots._wizardCandidates.length > 0) {
        return slots;
      }

      return {
        ...slots,
        _wizardCandidates: [{
          discriminatorField,
          variants,
          creatorIntentId: creatorIntent.id,
          source: "derived:discriminator-wizard",
        }],
      };
    },
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
