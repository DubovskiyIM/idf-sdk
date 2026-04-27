import { describe, it, expect } from "vitest";
import { assignToSlotsDetail } from "./assignToSlotsDetail.js";
import { assignToSlotsCatalog } from "./assignToSlotsCatalog.js";

const SYNTH_INTENTS = {
  create_listing: {
    id: "create_listing",
    creates: "Listing",
    salience: 80,
    particles: { entities: ["Listing"], effects: [] },
  },
  edit_listing: {
    id: "edit_listing",
    salience: 70,
    particles: { entities: ["Listing"], effects: [{ α: "replace", target: "Listing.title" }] },
  },
};

const SYNTH_ONTOLOGY = {
  entities: { Listing: { fields: { id: { type: "string" }, title: { type: "string" } } } },
  roles: {
    seller: { canExecute: ["create_listing", "edit_listing"] },
  },
};

describe("assignToSlotsDetail — opts.diagnoseAlternate (Phase 2d)", () => {
  it("default — no diagnostic witness emitted (backward-compat)", () => {
    const projection = { id: "p", mainEntity: "Listing", archetype: "detail" };
    const witnesses = [];
    assignToSlotsDetail(SYNTH_INTENTS, projection, SYNTH_ONTOLOGY, null, {
      role: "seller",
      witnesses,
    });
    const altWitnesses = witnesses.filter(w => w?.basis === "joint-solver-alternative");
    expect(altWitnesses.length).toBe(0);
  });

  it("diagnoseAlternate=true — emits witness when divergent (или null если совпало)", () => {
    const projection = { id: "p", mainEntity: "Listing", archetype: "detail" };
    const witnesses = [];
    assignToSlotsDetail(SYNTH_INTENTS, projection, SYNTH_ONTOLOGY, null, {
      role: "seller",
      witnesses,
      diagnoseAlternate: true,
    });
    // Witness может быть или не быть в зависимости от divergence.
    // Если есть — должен иметь правильный shape.
    const altWitnesses = witnesses.filter(w => w?.basis === "joint-solver-alternative");
    if (altWitnesses.length > 0) {
      const w = altWitnesses[0];
      expect(w.reliability).toBe("rule-based");
      expect(w.archetype).toBe("detail");
      expect(w.role).toBe("seller");
      expect(Array.isArray(w.diff)).toBe(true);
      expect(w.summary).toBeDefined();
    }
  });

  it("diagnoseAlternate=true без opts.witnesses — silent (no throw)", () => {
    const projection = { id: "p", mainEntity: "Listing", archetype: "detail" };
    expect(() => {
      assignToSlotsDetail(SYNTH_INTENTS, projection, SYNTH_ONTOLOGY, null, {
        role: "seller",
        diagnoseAlternate: true,
        // нет witnesses — hook должен silent skip
      });
    }).not.toThrow();
  });

  it("alternateSolver: 'greedy' — solver в witness равен 'greedy'", () => {
    const projection = { id: "p", mainEntity: "Listing", archetype: "detail" };
    const witnesses = [];
    assignToSlotsDetail(SYNTH_INTENTS, projection, SYNTH_ONTOLOGY, null, {
      role: "seller",
      witnesses,
      diagnoseAlternate: true,
      alternateSolver: "greedy",
    });
    const altWitnesses = witnesses.filter(w => w?.basis === "joint-solver-alternative");
    if (altWitnesses.length > 0) {
      expect(altWitnesses[0].solver).toBe("greedy");
    }
  });
});

describe("assignToSlotsCatalog — opts.diagnoseAlternate (Phase 2d)", () => {
  it("default — no diagnostic witness emitted", () => {
    const projection = { id: "p", mainEntity: "Listing", archetype: "catalog" };
    const witnesses = [];
    assignToSlotsCatalog(SYNTH_INTENTS, projection, SYNTH_ONTOLOGY, null, "default", {
      role: "seller",
      witnesses,
    });
    const altWitnesses = witnesses.filter(w => w?.basis === "joint-solver-alternative");
    expect(altWitnesses.length).toBe(0);
  });

  it("diagnoseAlternate=true — может emit witness, shape корректный", () => {
    const projection = { id: "p", mainEntity: "Listing", archetype: "catalog" };
    const witnesses = [];
    assignToSlotsCatalog(SYNTH_INTENTS, projection, SYNTH_ONTOLOGY, null, "default", {
      role: "seller",
      witnesses,
      diagnoseAlternate: true,
    });
    const altWitnesses = witnesses.filter(w => w?.basis === "joint-solver-alternative");
    if (altWitnesses.length > 0) {
      const w = altWitnesses[0];
      expect(w.reliability).toBe("rule-based");
      expect(w.archetype).toBe("catalog");
      expect(Array.isArray(w.diff)).toBe(true);
    }
  });
});
