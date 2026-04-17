import { describe, it, expect } from "vitest";
import { classifyPattern } from "./classifier.js";

const executionIntents = [
  { id: "buy_asset", particles: { entities: ["position: Position"], effects: [{ α: "add", target: "transactions" }] } },
  { id: "sell_asset", particles: { entities: ["position: Position"], effects: [{ α: "add", target: "transactions" }] } },
  { id: "set_stop_loss", particles: { entities: ["position: Position"], effects: [{ α: "replace", target: "position.stopLoss" }] } },
];

const triageIntents = [
  { id: "accept_recommendation", particles: { entities: ["rec: Recommendation"], effects: [{ α: "replace", target: "recommendation.status", value: "accepted" }] } },
  { id: "reject_recommendation", particles: { entities: ["rec: Recommendation"], effects: [{ α: "replace", target: "recommendation.status", value: "rejected" }] } },
  { id: "snooze_recommendation", particles: { entities: ["rec: Recommendation"], effects: [{ α: "replace", target: "recommendation.status", value: "snoozed" }] } },
];

const monitoringIntents = [
  { id: "view_portfolio", particles: { entities: ["p: Portfolio"], effects: [] } },
  { id: "view_chart", particles: { entities: ["p: Portfolio"], effects: [] } },
  { id: "view_history", particles: { entities: ["p: Portfolio"], effects: [] } },
  { id: "rename_portfolio", particles: { entities: ["p: Portfolio"], effects: [{ α: "replace", target: "portfolio.name" }] } },
];

const investOntology = {
  entities: {
    Position: {
      fields: {
        currentPrice: { type: "number", fieldRole: "money" },
        quantity: { type: "number" },
        unrealizedPnL: { type: "number", fieldRole: "money" },
      },
    },
    Asset: { kind: "reference", fields: { ticker: { type: "ticker" } } },
    Portfolio: {
      fields: {
        totalValue: { type: "number", fieldRole: "money" },
        pnl: { type: "number", fieldRole: "money" },
        targetStocks: { type: "number", fieldRole: "percentage" },
      },
    },
    Recommendation: { fields: { confidence: { type: "number", fieldRole: "percentage" } } },
  },
  roles: {
    agent: { preapproval: { entity: "AgentPreapproval" } },
  },
};

describe("classifyPattern", () => {
  it("classifies execution pattern for trading intents", () => {
    const result = classifyPattern(executionIntents, investOntology, { mainEntity: "Position" });
    expect(result.pattern).toBe("execution");
    expect(result.score).toBeGreaterThanOrEqual(5);
  });

  it("classifies triage pattern for recommendation intents", () => {
    const result = classifyPattern(triageIntents, investOntology, { mainEntity: "Recommendation" });
    expect(result.pattern).toBe("triage");
    expect(result.score).toBeGreaterThanOrEqual(4);
  });

  it("classifies monitoring for passive portfolio intents", () => {
    const result = classifyPattern(monitoringIntents, investOntology, { mainEntity: "Portfolio" });
    expect(result.pattern).toBe("monitoring");
    expect(result.score).toBeGreaterThanOrEqual(4);
  });

  it("returns null for empty intents", () => {
    const result = classifyPattern([], {}, {});
    expect(result.pattern).toBe(null);
  });

  it("respects projection.pattern override", () => {
    const result = classifyPattern(monitoringIntents, investOntology, { mainEntity: "Portfolio", pattern: "execution" });
    expect(result.pattern).toBe("execution");
    expect(result.score).toBe(Infinity);
    expect(result.confidence).toBe("high");
  });

  it("merges domain patterns from ontology.patterns with extends", () => {
    const ontologyWithPatterns = {
      ...investOntology,
      patterns: [{
        id: "client-management",
        extends: "monitoring",
        signals: [{ fn: "entityTopology", match: "has-assignment-m2m", weight: 4 }],
        threshold: 4,
      }],
      roles: {
        ...investOntology.roles,
        advisor: { scope: { User: { via: "assignments" } } },
      },
    };
    const result = classifyPattern(monitoringIntents, ontologyWithPatterns, { mainEntity: "Assignment" });
    expect(result.pattern).toBe("client-management");
  });

  it("confidence is high when score >> threshold", () => {
    // execution: bidirectional(3) + money+quantity(3) + preapproval(2) + reference(1) = 9, threshold 5
    // 9 >= 5*1.5=7.5 → high
    const result = classifyPattern(executionIntents, investOntology, { mainEntity: "Position" });
    expect(result.confidence).toBe("high");
  });
});
