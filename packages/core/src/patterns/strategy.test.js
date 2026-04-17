import { describe, it, expect } from "vitest";
import { buildStrategy, DEFAULT_STRATEGY } from "./strategy.js";

describe("DEFAULT_STRATEGY", () => {
  it("itemLayout returns card", () => {
    expect(DEFAULT_STRATEGY.itemLayout()).toBe("card");
  });

  it("emphasisFields returns first 3 fields as primary", () => {
    const result = DEFAULT_STRATEGY.emphasisFields(["a", "b", "c", "d"], {});
    expect(result.primary).toEqual(["a", "b", "c"]);
    expect(result.secondary).toEqual([]);
    expect(result.badge).toEqual([]);
  });

  it("preferControl returns default", () => {
    expect(DEFAULT_STRATEGY.preferControl({}, "formModal")).toBe("formModal");
  });

  it("aggregateHeader returns null", () => {
    expect(DEFAULT_STRATEGY.aggregateHeader()).toBe(null);
  });

  it("extraSlots returns empty object", () => {
    expect(DEFAULT_STRATEGY.extraSlots()).toEqual({});
  });
});

describe("buildStrategy", () => {
  it("returns DEFAULT_STRATEGY for null pattern", () => {
    const strategy = buildStrategy(null);
    expect(strategy.itemLayout()).toBe("card");
    expect(strategy.aggregateHeader()).toBe(null);
  });

  it("returns execution strategy", () => {
    const strategy = buildStrategy({ pattern: "execution" });
    expect(strategy.itemLayout()).toBe("table");
    expect(strategy.extraSlots()).toEqual({ riskBadge: true });
  });

  it("returns triage strategy", () => {
    const strategy = buildStrategy({ pattern: "triage" });
    expect(strategy.itemLayout()).toBe("compact");
    expect(strategy.extraSlots()).toEqual({ queueProgress: true });
  });

  it("returns monitoring strategy", () => {
    const strategy = buildStrategy({ pattern: "monitoring" });
    expect(strategy.itemLayout()).toBe("card");
    expect(strategy.extraSlots()).toEqual({ severityColors: true });
  });

  it("returns exploration strategy", () => {
    const strategy = buildStrategy({ pattern: "exploration" });
    expect(strategy.itemLayout()).toBe("card");
  });

  it("returns configuration strategy", () => {
    const strategy = buildStrategy({ pattern: "configuration" });
    expect(strategy.itemLayout()).toBe("row");
  });

  it("execution preferControl changes buy/sell to quick-action-pair", () => {
    const strategy = buildStrategy({ pattern: "execution" });
    const buyIntent = { id: "buy_asset", particles: { effects: [{ α: "add", target: "transactions" }] } };
    expect(strategy.preferControl(buyIntent, "formModal")).toBe("quick-action-pair");
  });

  it("triage preferControl changes accept/reject to quick-action-pair", () => {
    const strategy = buildStrategy({ pattern: "triage" });
    const acceptIntent = { id: "accept_recommendation", particles: { effects: [] } };
    expect(strategy.preferControl(acceptIntent, "formModal")).toBe("quick-action-pair");
  });

  it("configuration preferControl changes all-replace intent to inline-toggle", () => {
    const strategy = buildStrategy({ pattern: "configuration" });
    const toggleIntent = { id: "toggle_active", particles: { effects: [{ α: "replace", target: "rule.active" }] } };
    expect(strategy.preferControl(toggleIntent, "intentButton")).toBe("inline-toggle");
  });

  it("returns DEFAULT_STRATEGY for unknown pattern", () => {
    const strategy = buildStrategy({ pattern: "unknown-pattern" });
    expect(strategy).toBe(DEFAULT_STRATEGY);
  });
});
