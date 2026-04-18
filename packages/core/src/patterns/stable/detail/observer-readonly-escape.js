/**
 * observer-readonly-escape — observer-scoped detail с единым high-irreversibility CTA.
 *
 * Роль observer (§5 base) обычно имеет 0 write-intents: она смотрит,
 * генерирует отчёты, экспортирует. Единственное write-действие — escape:
 * escalate / dispute / flag / freeze (high-irreversibility).
 * Этот single CTA становится primary для всей observer-projection.
 *
 * Signal: Stripe payment-detail (observer) → Dispute button как единственный
 * write-путь. Аналогично flag_anomaly (invest), escalate_alert.
 */
export default {
  id: "observer-readonly-escape",
  version: 1,
  status: "stable",
  archetype: "detail",
  trigger: {
    requires: [
      { kind: "has-role", roleBase: "observer" },
    ],
    match(intents, ontology, _projection) {
      if (!ontology?.roles) return false;
      const observerRoles = Object.entries(ontology.roles)
        .filter(([, r]) => r.base === "observer");
      if (observerRoles.length === 0) return false;
      // У observer есть ≥1 high-irreversibility intent — escape-путь.
      const observerIntentIds = new Set();
      for (const [, r] of observerRoles) {
        for (const id of r.canExecute || []) observerIntentIds.add(id);
      }
      const escapes = intents.filter(i =>
        observerIntentIds.has(i.id) && i.irreversibility === "high"
      );
      return escapes.length >= 1;
    },
  },
  structure: {
    slot: "primaryCTA",
    description:
      "Единственный primary CTA в detail-view для observer-role: high-irreversibility escape (Dispute/Escalate/Flag/Freeze). " +
      "Require type-to-confirm для случайных кликов. Остальная surface read-only.",
  },
  rationale: {
    hypothesis:
      "Observer-роль по природе не транзакционна, но правовой/compliance-контекст требует эскалационного пути. " +
      "Един primary CTA снижает когнитивную нагрузку vs запрятанный в меню пункт, и делает terminal-действие очевидным.",
    evidence: [
      { source: "stripe", description: "Payment detail (observer view): Dispute button внизу как единственный write с type-to-confirm", reliability: "high" },
      { source: "github", description: "Report abuse / flag comment для read-only viewer", reliability: "high" },
      { source: "plaid-dashboard", description: "Compliance viewer: Freeze account — единственный escape для fraud cases", reliability: "medium" },
    ],
    counterexample: [
      {
        source: "public-docs-viewer",
        description: "Docs viewer без права report/flag — observer без escape, CTA неприменим",
        reliability: "high",
      },
    ],
  },
  falsification: {
    // Из всех IDF доменов observer-base-role объявлена только в invest;
    // requirement «≥1 high-irreversibility intent доступен observer'у» —
    // сильное условие. Pattern зарезервирован для fintech-domains.
    shouldMatch: [
      // В текущей ontology invest observer не имеет irreversibility=high intents
      // в своём canExecute; match произойдёт когда агент/владелец добавит
      // escalate/freeze для observer-роли. Aspirational shouldMatch сохраняем
      // как документацию намерения паттерна.
      { domain: "invest", projection: "alert_detail", reason: "aspirational: когда escalate_alert попадёт в observer.canExecute с irreversibility:high" },
    ],
    shouldNotMatch: [
      { domain: "lifequest", projection: "habit_detail", reason: "lifequest не имеет observer-role" },
      { domain: "booking", projection: "booking_detail", reason: "booking не имеет observer-role" },
    ],
  },
};
