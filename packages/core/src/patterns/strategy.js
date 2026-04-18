/**
 * Rendering Strategy — объект чистых функций, определяющий
 * поведение рендеринга внутри архетипа.
 *
 * strategy.itemLayout() — "card" | "table" | "compact" | "row"
 * strategy.emphasisFields(fields, fieldRoles) → { primary, secondary, badge }
 * strategy.preferControl(intent, defaultControl) → controlType
 * strategy.aggregateHeader() → null | { aggregation }
 * strategy.extraSlots() → { riskBadge?, queueProgress?, severityColors? }
 */

import { inferFieldRole } from "../crystallize_v2/ontologyHelpers.js";

export const DEFAULT_STRATEGY = {
  itemLayout: () => "card",
  emphasisFields: (fields) => ({ primary: fields.slice(0, 3), secondary: [], badge: [] }),
  preferControl: (_intent, defaultControl) => defaultControl,
  aggregateHeader: () => null,
  extraSlots: () => ({}),
};

const BUY_SELL_WORDS = ["buy", "sell", "deposit", "withdraw", "long", "short"];
const TRIAGE_WORDS = ["accept", "reject", "approve", "decline", "acknowledge", "dismiss", "ack", "snooze"];

const PATTERN_STRATEGIES = {
  monitoring: {
    itemLayout: () => "card",
    emphasisFields: (fields, fieldRoles) => {
      const primary = [];
      const secondary = [];
      const badge = [];
      for (const f of fields) {
        const role = fieldRoles?.[f] || inferFieldRole(f, {})?.role;
        if (role === "money" || role === "percentage") primary.push(f);
        else if (role === "deadline" || role === "badge") badge.push(f);
        else if (role === "trend" || role === "scheduled" || role === "timestamp") secondary.push(f);
      }
      if (primary.length === 0) primary.push(...fields.slice(0, 2));
      return { primary, secondary, badge };
    },
    preferControl: (_intent, def) => def,
    aggregateHeader: () => ({ aggregation: "sum" }),
    extraSlots: () => ({ severityColors: true }),
  },

  triage: {
    itemLayout: () => "compact",
    emphasisFields: (fields, fieldRoles) => {
      const primary = [];
      const secondary = [];
      const badge = [];
      for (const f of fields) {
        const role = fieldRoles?.[f] || inferFieldRole(f, {})?.role;
        if (role === "title") primary.push(f);
        else if (role === "description") secondary.push(f);
        else if (role === "deadline" || role === "badge" || role === "metric") badge.push(f);
      }
      if (primary.length === 0) primary.push(fields[0] || "name");
      return { primary, secondary, badge };
    },
    preferControl: (intent, def) => {
      const id = (intent?.id || "").toLowerCase();
      if (TRIAGE_WORDS.some(w => id.includes(w))) return "quick-action-pair";
      return def;
    },
    aggregateHeader: () => ({ aggregation: "count" }),
    extraSlots: () => ({ queueProgress: true }),
  },

  execution: {
    itemLayout: () => "table",
    emphasisFields: (fields, fieldRoles) => {
      const primary = [];
      const secondary = [];
      const badge = [];
      for (const f of fields) {
        const role = fieldRoles?.[f] || inferFieldRole(f, {})?.role;
        if (role === "ticker" || role === "money") primary.push(f);
        else if (role === "metric" || role === "percentage") secondary.push(f);
        else if (role === "trend" || role === "badge") badge.push(f);
      }
      if (primary.length === 0) primary.push(...fields.slice(0, 2));
      return { primary, secondary, badge };
    },
    preferControl: (intent, def) => {
      const id = (intent?.id || "").toLowerCase();
      if (BUY_SELL_WORDS.some(w => id.includes(w))) return "quick-action-pair";
      return def;
    },
    aggregateHeader: () => ({ aggregation: "sum" }),
    extraSlots: () => ({ riskBadge: true }),
  },

  exploration: {
    itemLayout: () => "card",
    emphasisFields: (fields, fieldRoles) => {
      const primary = [];
      const secondary = [];
      const badge = [];
      for (const f of fields) {
        const role = fieldRoles?.[f] || inferFieldRole(f, {})?.role;
        if (role === "title" || role === "ticker") primary.push(f);
        else if (role === "description" || role === "money") secondary.push(f);
        else if (role === "badge") badge.push(f);
      }
      if (primary.length === 0) primary.push(...fields.slice(0, 2));
      return { primary, secondary, badge };
    },
    preferControl: (_intent, def) => def,
    aggregateHeader: () => null,
    extraSlots: () => ({}),
  },

  configuration: {
    itemLayout: () => "row",
    emphasisFields: (fields, fieldRoles) => {
      // Configuration акцентирует редактируемые поля (write-доступ)
      const editable = fields.filter(f => {
        const role = fieldRoles?.[f];
        // Поля с fieldRole (money, percentage) обычно editable в settings
        return role === "percentage" || role === "money" || role === "metric";
      });
      const primary = editable.length > 0 ? editable.slice(0, 5) : fields.slice(0, 5);
      return { primary, secondary: [], badge: [] };
    },
    preferControl: (intent, def) => {
      const effects = intent?.particles?.effects || [];
      if (effects.length > 0 && effects.every(e => e.α === "replace")) return "inline-toggle";
      return def;
    },
    aggregateHeader: () => null,
    extraSlots: () => ({}),
  },
};

/**
 * Построить strategy из результата classifier.
 *
 * @param {{ pattern: string|null }} classifierResult
 * @param {object} [ontology] — для domain-specific strategy overrides
 * @returns {object} strategy object
 */
export function buildStrategy(classifierResult, ontology) {
  if (!classifierResult?.pattern) return DEFAULT_STRATEGY;

  const patternId = classifierResult.pattern;
  const base = PATTERN_STRATEGIES[patternId];
  if (!base) return DEFAULT_STRATEGY;

  const domainPattern = (ontology?.patterns || []).find(p => p.id === patternId);
  if (domainPattern?.strategy) {
    return { ...base, ...domainPattern.strategy };
  }

  return base;
}
