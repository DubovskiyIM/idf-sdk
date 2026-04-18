/**
 * lifecycle-locked-parameters — writable at create, read-only after activation.
 *
 * Для сущностей с lifecycle-контрактом (Subscription, AgentPreapproval,
 * Mortgage, Lease): параметры, определяемые при создании — maxAmount,
 * allowedScope, endDate — становятся immutable после активации.
 * UI должен различать два режима и объяснять почему поле read-only.
 *
 * Signal: Stripe subscription preapproval, IDF AgentPreapproval (invest/delivery).
 */
export default {
  id: "lifecycle-locked-parameters",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "entity-field", field: "status", minOptions: 2 },
    ],
    match(intents, ontology, projection) {
      const mainEntity = projection?.mainEntity;
      if (!mainEntity) return false;
      const entity = ontology?.entities?.[mainEntity];
      if (!entity) return false;
      // Сущность имеет status-field с active-состоянием (declared via statuses или fields.status.options)
      const statuses = entity.statuses ||
        (typeof entity.fields === "object" && entity.fields.status?.options) || [];
      const hasActive = statuses.some(s => /active|running|confirmed|captured|accepted/i.test(s));
      if (!hasActive) return false;
      // Есть replace-intents на mainEntity.*, но они предназначены для draft-фазы
      // (имя начинается с set_ / update_ / configure_ до активации).
      const mainLower = mainEntity.toLowerCase();
      const configureIntents = intents.filter(i => {
        const effects = i.particles?.effects || [];
        return effects.some(e =>
          e.α === "replace" && typeof e.target === "string" &&
          e.target.toLowerCase().startsWith(`${mainLower}.`)
        );
      });
      return configureIntents.length >= 2;
    },
  },
  structure: {
    slot: "sections",
    description:
      "Locked-parameters-секция в detail: read-only view параметров (maxAmount, scope, expiresAt) с inline explainer " +
      "«immutable after activation». Если status=draft/pending — fields writable. После active → read-only с tooltip и " +
      "ссылкой на intent cancel_and_recreate если полная переконфигурация нужна.",
  },
  rationale: {
    hypothesis:
      "Поля с lifecycle-contract требуют двух режимов отображения. Одинаковый read/write-рендеринг создаёт ложное ожидание " +
      "возможности edit'а post-activation. Explicit разделение (writable-draft-card vs locked-active-card с explainer) " +
      "снижает support cost и делает immutability-semantics видимой.",
    evidence: [
      { source: "stripe", description: "Subscription после activation: trial/interval/price immutable, отдельный update_subscription intent", reliability: "high" },
      { source: "aws-reserved-instance", description: "Reserved instance: term/region/size locked after purchase", reliability: "high" },
      { source: "idf-invest", description: "AgentPreapproval: maxOrderAmount/allowedAssetTypes locked после active=true", reliability: "high" },
    ],
    counterexample: [
      {
        source: "user-profile",
        description: "Profile-поля всегда editable — нет lifecycle-gate",
        reliability: "high",
      },
    ],
  },
  falsification: {
    shouldMatch: [
      { domain: "booking", projection: "booking_detail", reason: "Booking после confirm — slot/service locked, только cancel" },
      { domain: "delivery", projection: "order_detail", reason: "Order после placed — items locked, изменения через refund" },
      { domain: "sales", projection: "listing_detail", reason: "Listing после published — изменение через отдельный update_listing" },
    ],
    shouldNotMatch: [
      { domain: "invest", projection: "watchlists_root", reason: "Watchlist — catalog без lifecycle-gate" },
      { domain: "planning", projection: "my_polls", reason: "Polls всегда editable до close_poll" },
    ],
  },
};
