import { describe, it, expect } from "vitest";
import {
  intentActionShape,
  fieldRoleCluster,
  entityTopology,
  intentPairSymmetry,
  effectDensity,
} from "./signals.js";

describe("intentActionShape", () => {
  it("detects bidirectional-trade (buy + sell)", () => {
    const intents = [
      { id: "buy_asset", particles: { effects: [{ α: "add", target: "transactions" }] } },
      { id: "sell_asset", particles: { effects: [{ α: "add", target: "transactions" }] } },
    ];
    expect(intentActionShape(intents, {}, {}, "bidirectional-trade")).toBe(true);
  });

  it("detects binary-decision (accept + reject on same status field)", () => {
    const intents = [
      { id: "accept_recommendation", particles: { effects: [{ α: "replace", target: "recommendation.status", value: "accepted" }] } },
      { id: "reject_recommendation", particles: { effects: [{ α: "replace", target: "recommendation.status", value: "rejected" }] } },
    ];
    expect(intentActionShape(intents, {}, {}, "binary-decision")).toBe(true);
  });

  it("detects read-dominant (few writes)", () => {
    const intents = [
      { id: "view_portfolio", particles: { effects: [] } },
      { id: "view_chart", particles: { effects: [] } },
      { id: "view_history", particles: { effects: [] } },
      { id: "rename", particles: { effects: [{ α: "replace", target: "portfolio.name" }] } },
    ];
    // 1/4 = 0.25 < 0.3
    expect(intentActionShape(intents, {}, {}, "read-dominant")).toBe(true);
  });

  it("detects replace-dominant", () => {
    const intents = [
      { id: "set_a", particles: { effects: [{ α: "replace", target: "x.a" }] } },
      { id: "set_b", particles: { effects: [{ α: "replace", target: "x.b" }] } },
      { id: "set_c", particles: { effects: [{ α: "replace", target: "x.c" }] } },
    ];
    expect(intentActionShape(intents, {}, {}, "replace-dominant")).toBe(true);
  });

  it("detects crud", () => {
    const intents = [
      { id: "create", particles: { effects: [{ α: "add", target: "items" }] } },
      { id: "edit", particles: { effects: [{ α: "replace", target: "item.name" }] } },
      { id: "delete", particles: { effects: [{ α: "remove", target: "items" }] } },
    ];
    expect(intentActionShape(intents, {}, {}, "crud")).toBe(true);
  });

  it("returns false for non-matching shape", () => {
    const intents = [
      { id: "create", particles: { effects: [{ α: "add", target: "items" }] } },
    ];
    expect(intentActionShape(intents, {}, {}, "bidirectional-trade")).toBe(false);
  });
});

describe("fieldRoleCluster", () => {
  const ontologyWithMoney = {
    entities: {
      Position: {
        fields: {
          currentPrice: { type: "number", fieldRole: "money" },
          quantity: { type: "number" },
          ticker: { type: "ticker" },
        },
      },
    },
  };

  it("detects money+quantity cluster", () => {
    const intents = [
      { id: "buy", particles: { entities: ["position: Position"], effects: [] } },
    ];
    expect(fieldRoleCluster(intents, ontologyWithMoney, {}, ["money", "quantity"])).toBe(true);
  });

  it("detects money+quantity+ticker cluster via mainEntity", () => {
    const intents = [];
    expect(fieldRoleCluster(intents, ontologyWithMoney, { mainEntity: "Position" }, ["money", "ticker"])).toBe(true);
  });

  it("returns false when role missing", () => {
    const ontology = { entities: { Item: { fields: { name: { type: "text" } } } } };
    const intents = [{ id: "x", particles: { entities: ["item: Item"], effects: [] } }];
    expect(fieldRoleCluster(intents, ontology, {}, ["money"])).toBe(false);
  });
});

describe("entityTopology", () => {
  it("detects has-reference-asset", () => {
    const ontology = { entities: { Asset: { kind: "reference" } } };
    expect(entityTopology([], ontology, {}, "has-reference-asset")).toBe(true);
  });

  it("detects has-preapproval", () => {
    const ontology = { roles: { agent: { preapproval: { entity: "AgentPreapproval" } } } };
    expect(entityTopology([], ontology, {}, "has-preapproval")).toBe(true);
  });

  it("detects has-assignment-m2m", () => {
    const ontology = { roles: { advisor: { scope: { User: { via: "assignments" } } } } };
    expect(entityTopology([], ontology, {}, "has-assignment-m2m")).toBe(true);
  });

  it("returns false for unknown match", () => {
    expect(entityTopology([], {}, {}, "unknown")).toBe(false);
  });
});

describe("intentPairSymmetry", () => {
  it("detects accept-reject pair", () => {
    const intents = [
      { id: "accept_recommendation", particles: { effects: [] } },
      { id: "reject_recommendation", particles: { effects: [] } },
    ];
    expect(intentPairSymmetry(intents, {}, {}, "accept-reject")).toBe(true);
  });

  it("detects ack-dismiss pair", () => {
    const intents = [
      { id: "acknowledge_alert", particles: { effects: [] } },
      { id: "dismiss_alert", particles: { effects: [] } },
    ];
    expect(intentPairSymmetry(intents, {}, {}, "ack-dismiss")).toBe(true);
  });

  it("returns false with no symmetric pair", () => {
    const intents = [{ id: "create", particles: { effects: [] } }];
    expect(intentPairSymmetry(intents, {}, {}, "accept-reject")).toBe(false);
  });
});

describe("effectDensity", () => {
  it("detects write-sparse (<30%)", () => {
    const intents = [
      { id: "v1", particles: { effects: [] } },
      { id: "v2", particles: { effects: [] } },
      { id: "v3", particles: { effects: [] } },
      { id: "edit", particles: { effects: [{ α: "replace", target: "x" }] } },
    ];
    expect(effectDensity(intents, {}, {}, "write-sparse")).toBe(true);
  });

  it("detects write-dense (>70%)", () => {
    const intents = [
      { id: "set_a", particles: { effects: [{ α: "replace", target: "x.a" }] } },
      { id: "set_b", particles: { effects: [{ α: "replace", target: "x.b" }] } },
      { id: "set_c", particles: { effects: [{ α: "replace", target: "x.c" }] } },
      { id: "view", particles: { effects: [] } },
    ];
    expect(effectDensity(intents, {}, {}, "write-dense")).toBe(true);
  });

  it("detects balanced", () => {
    const intents = [
      { id: "a", particles: { effects: [{ α: "add", target: "x" }] } },
      { id: "b", particles: { effects: [] } },
    ];
    expect(effectDensity(intents, {}, {}, "balanced")).toBe(true);
  });

  it("returns false for empty intents", () => {
    expect(effectDensity([], {}, {}, "write-sparse")).toBe(false);
  });
});
