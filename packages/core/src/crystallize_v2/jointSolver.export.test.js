import { describe, it, expect } from "vitest";
import * as core from "../index.js";

describe("@intent-driven/core — jointSolver exports (A2 Phase 1)", () => {
  it("экспортирует buildCostMatrix, greedyAssign, classifyIntentRole, INFINITY_COST", () => {
    expect(typeof core.buildCostMatrix).toBe("function");
    expect(typeof core.greedyAssign).toBe("function");
    expect(typeof core.classifyIntentRole).toBe("function");
    expect(core.INFINITY_COST).toBe(Number.POSITIVE_INFINITY);
  });

  it("end-to-end через публичный API", () => {
    const slots = {
      primaryCTA: { capacity: 1, allowedRoles: ["primary"] },
      toolbar: { capacity: 5, allowedRoles: ["secondary", "utility", "navigation"] },
    };
    const intents = [
      { id: "edit", salience: 80, particles: { effects: [] } },
      { id: "view", salience: 20, particles: { effects: [] } },
    ];
    const matrix = core.buildCostMatrix({ intents, slots });
    const result = core.greedyAssign(matrix, slots);
    expect(result.assignment.get("edit")).toBe("primaryCTA");
    expect(result.assignment.get("view")).toBe("toolbar");
  });
});
