import { describe, it, expect } from "vitest";
import * as core from "../index.js";

describe("@intent-driven/core — diagnose exports (A2 Phase 2c)", () => {
  it("экспортирует extractDerivedAssignment, diagnoseAssignment", () => {
    expect(typeof core.extractDerivedAssignment).toBe("function");
    expect(typeof core.diagnoseAssignment).toBe("function");
  });

  it("end-to-end через публичный API", () => {
    const INTENTS = {
      a: { id: "a", salience: 80, particles: { entities: ["Item"], effects: [] } },
    };
    const ONTOLOGY = {
      entities: { Item: { fields: {} } },
      roles: { user: { canExecute: ["a"] } },
    };
    const projection = { id: "p", mainEntity: "Item", archetype: "detail" };

    // Derived ставит intent в footer (странно для primary salience 80)
    const derivedSlots = {
      footer: [{ intentId: "a" }],
    };

    const witness = core.diagnoseAssignment({
      INTENTS, projection, ONTOLOGY, derivedSlots, role: "user",
    });

    expect(witness).not.toBeNull();
    expect(witness.basis).toBe("joint-solver-alternative");
    expect(witness.diff.length).toBeGreaterThan(0);

    // Alternate (Hungarian) ставит в primaryCTA, derived в footer
    const aDiff = witness.diff.find(d => d.intentId === "a");
    expect(aDiff.kind).toBe("divergent");
    expect(aDiff.derived).toBe("footer");
    expect(aDiff.alternate).toBe("primaryCTA");
  });
});
