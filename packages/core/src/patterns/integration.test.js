/**
 * Integration-тесты UX Pattern Layer с invest fixtures.
 * Проверяют что classifier правильно выводит паттерны для реальных
 * проекций invest-домена.
 */
import { describe, it, expect } from "vitest";
import { resolvePattern } from "./index.js";

const investOntology = {
  entities: {
    Portfolio: {
      ownerField: "userId",
      fields: {
        id: { type: "text" }, name: { type: "text" },
        totalValue: { type: "number", fieldRole: "money" },
        pnl: { type: "number", fieldRole: "money" },
        targetStocks: { type: "number", fieldRole: "percentage" },
      },
    },
    Position: {
      ownerField: "userId",
      fields: {
        id: { type: "text" }, assetId: { type: "text" },
        quantity: { type: "number" },
        currentPrice: { type: "number", fieldRole: "money" },
        unrealizedPnL: { type: "number", fieldRole: "money" },
      },
    },
    Asset: { kind: "reference", fields: { ticker: { type: "ticker" }, name: { type: "text" } } },
    Recommendation: {
      fields: {
        status: { type: "select" }, confidence: { type: "number", fieldRole: "percentage" },
        rationale: { type: "textarea" },
      },
    },
    Alert: {
      fields: {
        severity: { type: "select" }, message: { type: "text" }, acknowledged: { type: "boolean" },
      },
    },
    Transaction: {
      fields: {
        price: { type: "number", fieldRole: "money" }, total: { type: "number", fieldRole: "money" },
        quantity: { type: "number" },
      },
    },
    Watchlist: { fields: { name: { type: "text" }, assetIds: { type: "text" } } },
    Assignment: { ownerField: "advisorId", fields: { clientId: { type: "text" }, status: { type: "select" } } },
  },
  roles: {
    agent: { preapproval: { entity: "AgentPreapproval" } },
    advisor: { scope: { User: { via: "assignments", viewerField: "advisorId" } } },
  },
};

describe("invest pattern classification", () => {
  it("portfolios_root → monitoring (write-sparse, money+percentage)", () => {
    const intents = [
      { id: "create_portfolio", particles: { entities: ["p: Portfolio"], effects: [{ α: "add", target: "portfolios" }] } },
      { id: "view_1", particles: { entities: ["p: Portfolio"], effects: [] } },
      { id: "view_2", particles: { entities: ["p: Portfolio"], effects: [] } },
      { id: "view_3", particles: { entities: ["p: Portfolio"], effects: [] } },
    ];
    const result = resolvePattern(intents, investOntology, { mainEntity: "Portfolio" });
    expect(result.pattern).toBe("monitoring");
    expect(result.strategy.itemLayout()).toBe("card");
    expect(result.strategy.extraSlots().severityColors).toBe(true);
  });

  it("positions (sub-collection) → execution (buy+sell, money+quantity, preapproval)", () => {
    const intents = [
      { id: "buy_asset", particles: { entities: ["p: Position"], effects: [{ α: "add", target: "transactions" }] } },
      { id: "sell_asset", particles: { entities: ["p: Position"], effects: [{ α: "add", target: "transactions" }] } },
      { id: "set_stop_loss", particles: { entities: ["p: Position"], effects: [{ α: "replace", target: "position.stopLoss" }] } },
    ];
    const result = resolvePattern(intents, investOntology, { mainEntity: "Position" });
    expect(result.pattern).toBe("execution");
    expect(result.strategy.itemLayout()).toBe("table");
    expect(result.strategy.extraSlots().riskBadge).toBe(true);
  });

  it("recommendations_inbox → triage (accept/reject/snooze)", () => {
    const intents = [
      { id: "accept_recommendation", particles: { entities: ["r: Recommendation"], effects: [{ α: "replace", target: "recommendation.status", value: "accepted" }] } },
      { id: "reject_recommendation", particles: { entities: ["r: Recommendation"], effects: [{ α: "replace", target: "recommendation.status", value: "rejected" }] } },
      { id: "snooze_recommendation", particles: { entities: ["r: Recommendation"], effects: [{ α: "replace", target: "recommendation.status", value: "snoozed" }] } },
    ];
    const result = resolvePattern(intents, investOntology, { mainEntity: "Recommendation" });
    expect(result.pattern).toBe("triage");
    expect(result.strategy.itemLayout()).toBe("compact");
    expect(result.strategy.extraSlots().queueProgress).toBe(true);
  });

  it("alerts_feed → triage (ack/dismiss)", () => {
    const intents = [
      { id: "acknowledge_alert", particles: { entities: ["a: Alert"], effects: [{ α: "replace", target: "alert.acknowledged", value: true }] } },
      { id: "dismiss_alert", particles: { entities: ["a: Alert"], effects: [{ α: "remove", target: "alerts" }] } },
      { id: "escalate_alert", particles: { entities: ["a: Alert"], effects: [{ α: "replace", target: "alert.severity", value: "critical" }] } },
    ];
    const result = resolvePattern(intents, investOntology, { mainEntity: "Alert" });
    expect(result.pattern).toBe("triage");
  });

  it("advisor_clients with domain pattern → client-management", () => {
    const ontologyWithPatterns = {
      ...investOntology,
      patterns: [{
        id: "client-management",
        extends: "monitoring",
        signals: [{ fn: "entityTopology", match: "has-assignment-m2m", weight: 4 }],
        threshold: 4,
      }],
    };
    const intents = [
      { id: "assign_client", particles: { entities: ["a: Assignment"], effects: [{ α: "add", target: "assignments" }] } },
      { id: "view_1", particles: { entities: ["a: Assignment"], effects: [] } },
      { id: "view_2", particles: { entities: ["a: Assignment"], effects: [] } },
      { id: "view_3", particles: { entities: ["a: Assignment"], effects: [] } },
    ];
    const result = resolvePattern(intents, ontologyWithPatterns, { mainEntity: "Assignment" });
    expect(result.pattern).toBe("client-management");
  });

  it("empty intents with rich ontology → ontology-level signals may match", () => {
    // Без intent'ов entityTopology сигналы (preapproval, reference) всё ещё fire.
    // fieldRoleCluster тоже — Transaction имеет money+quantity.
    // Конкретный паттерн зависит от весов; проверяем что strategy валидна.
    const result = resolvePattern([], investOntology, { mainEntity: "Transaction" });
    expect(result.strategy).toBeDefined();
    expect(typeof result.strategy.itemLayout).toBe("function");
    // Не фиксируем конкретный pattern — он зависит от балансировки весов
  });

  it("empty intents with empty ontology → null pattern", () => {
    const result = resolvePattern([], {}, {});
    expect(result.pattern).toBe(null);
    expect(result.strategy.itemLayout()).toBe("card");
  });

  it("non-invest CRUD domain → null or weak pattern (не execution/triage)", () => {
    const simpleOntology = { entities: { Task: { fields: { title: { type: "text" } } } } };
    const intents = [
      { id: "create_task", particles: { entities: ["t: Task"], effects: [{ α: "add", target: "tasks" }] } },
      { id: "edit_task", particles: { entities: ["t: Task"], effects: [{ α: "replace", target: "task.title" }] } },
      { id: "delete_task", particles: { entities: ["t: Task"], effects: [{ α: "remove", target: "tasks" }] } },
    ];
    const result = resolvePattern(intents, simpleOntology, { mainEntity: "Task" });
    // Простой CRUD не должен матчить execution или triage
    expect(result.pattern).not.toBe("execution");
    expect(result.pattern).not.toBe("triage");
  });
});
