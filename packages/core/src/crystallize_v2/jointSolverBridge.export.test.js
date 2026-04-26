import { describe, it, expect } from "vitest";
import * as core from "../index.js";

describe("@intent-driven/core — bridge exports (A2 Phase 2b)", () => {
  it("экспортирует computeAlternateAssignment, getDefaultSlotsForArchetype", () => {
    expect(typeof core.computeAlternateAssignment).toBe("function");
    expect(typeof core.getDefaultSlotsForArchetype).toBe("function");
  });

  it("end-to-end через публичный API", () => {
    const INTENTS = {
      a: {
        id: "a",
        salience: 80,
        particles: { entities: ["Item"], effects: [] },
      },
    };
    const ONTOLOGY = {
      entities: { Item: { fields: {} } },
      roles: { user: { canExecute: ["a"] } },
    };
    const projection = { id: "p", mainEntity: "Item", archetype: "detail" };
    const result = core.computeAlternateAssignment(INTENTS, projection, ONTOLOGY, { role: "user" });
    expect(result.metadata.basis).toBe("joint-solver-alternative");
    expect(result.assignment.get("a")).toBe("primaryCTA");
  });
});
