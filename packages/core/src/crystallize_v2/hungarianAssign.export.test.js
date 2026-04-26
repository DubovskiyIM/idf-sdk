import { describe, it, expect } from "vitest";
import * as core from "../index.js";

describe("@intent-driven/core — hungarianAssign exports (A2 Phase 2a)", () => {
  it("экспортирует hungarianAssign, hungarianMatch, expandSlots", () => {
    expect(typeof core.hungarianAssign).toBe("function");
    expect(typeof core.hungarianMatch).toBe("function");
    expect(typeof core.expandSlots).toBe("function");
  });

  it("end-to-end через публичный API", () => {
    const slots = {
      primary: { capacity: 1, allowedRoles: ["primary"] },
      toolbar: { capacity: 5, allowedRoles: ["secondary", "utility", "navigation"] },
    };
    const intents = [
      { id: "edit", salience: 80, particles: { effects: [] } },
      { id: "view", salience: 20, particles: { effects: [] } },
    ];
    const matrix = core.buildCostMatrix({ intents, slots });
    const result = core.hungarianAssign(matrix, slots);
    expect(result.assignment.get("edit")).toBe("primary");
    expect(result.assignment.get("view")).toBe("toolbar");
  });
});
