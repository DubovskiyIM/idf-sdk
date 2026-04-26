import { describe, it, expect } from "vitest";
import {
  getDefaultSlotsForArchetype,
  computeAlternateAssignment,
} from "./jointSolverBridge.js";

describe("getDefaultSlotsForArchetype", () => {
  it("catalog → hero/toolbar/context/fab", () => {
    const slots = getDefaultSlotsForArchetype("catalog");
    expect(Object.keys(slots)).toEqual(["hero", "toolbar", "context", "fab"]);
    expect(slots.hero.capacity).toBe(1);
    expect(slots.hero.allowedRoles).toContain("primary");
  });

  it("detail → primaryCTA/secondary/toolbar/footer", () => {
    const slots = getDefaultSlotsForArchetype("detail");
    expect(Object.keys(slots)).toEqual(["primaryCTA", "secondary", "toolbar", "footer"]);
    expect(slots.primaryCTA.capacity).toBe(3);
    expect(slots.primaryCTA.allowedRoles).toContain("destructive");
  });

  it("feed → toolbar/context/fab (без hero)", () => {
    const slots = getDefaultSlotsForArchetype("feed");
    expect("toolbar" in slots).toBe(true);
    expect("hero" in slots).toBe(false);
  });

  it("неизвестный archetype → fallback на catalog", () => {
    const slots = getDefaultSlotsForArchetype("unknown");
    expect("toolbar" in slots).toBe(true);
    expect("hero" in slots).toBe(true);
  });
});

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
  delete_listing: {
    id: "delete_listing",
    salience: 30,
    particles: { entities: ["Listing"], effects: [{ α: "remove", target: "Listing" }] },
  },
  view_history: {
    id: "view_history",
    salience: 10,
    particles: { entities: ["Listing"], effects: [] },
  },
};

const SYNTH_ONTOLOGY = {
  entities: { Listing: { fields: { id: { type: "string" } } } },
  roles: {
    seller: { canExecute: ["create_listing", "edit_listing", "delete_listing", "view_history"] },
  },
};

const SYNTH_PROJECTION = {
  id: "listing_detail",
  mainEntity: "Listing",
  archetype: "detail",
};

describe("computeAlternateAssignment", () => {
  it("извлекает intents через accessibleIntents и распределяет по default slots", () => {
    const result = computeAlternateAssignment(SYNTH_INTENTS, SYNTH_PROJECTION, SYNTH_ONTOLOGY, {
      role: "seller",
    });
    expect(result.assignment.size).toBeGreaterThan(0);
    // create_listing (primary, salience 80) → primaryCTA
    expect(result.assignment.get("create_listing")).toBe("primaryCTA");
    // edit_listing (secondary, salience 70) → secondary или toolbar
    expect(["secondary", "toolbar"]).toContain(result.assignment.get("edit_listing"));
    // delete_listing (navigation+destructive, salience 30) → primaryCTA или footer
    expect(["primaryCTA", "footer"]).toContain(result.assignment.get("delete_listing"));
    // view_history (utility, salience 10) → toolbar или footer
    expect(["toolbar", "footer"]).toContain(result.assignment.get("view_history"));
  });

  it("metadata содержит basis 'joint-solver-alternative' и diagnostic поля", () => {
    const result = computeAlternateAssignment(SYNTH_INTENTS, SYNTH_PROJECTION, SYNTH_ONTOLOGY, {
      role: "seller",
    });
    expect(result.metadata).toBeDefined();
    expect(result.metadata.basis).toBe("joint-solver-alternative");
    expect(result.metadata.reliability).toBe("rule-based");
    expect(result.metadata.archetype).toBe("detail");
    expect(result.metadata.role).toBe("seller");
    expect(result.metadata.mainEntity).toBe("Listing");
    expect(result.metadata.solver).toBe("hungarian");
    expect(result.metadata.intentCount).toBeGreaterThan(0);
    expect(result.metadata.slotNames).toEqual(["primaryCTA", "secondary", "toolbar", "footer"]);
  });

  it("opts.slots override — использует переданный slot model", () => {
    const customSlots = {
      onlyOne: { capacity: 1, allowedRoles: ["primary"] },
    };
    const result = computeAlternateAssignment(SYNTH_INTENTS, SYNTH_PROJECTION, SYNTH_ONTOLOGY, {
      role: "seller",
      slots: customSlots,
    });
    expect(result.assignment.size).toBeLessThanOrEqual(1);
    if (result.assignment.size === 1) {
      expect([...result.assignment.values()]).toEqual(["onlyOne"]);
    }
    expect(result.metadata.slotNames).toEqual(["onlyOne"]);
  });

  it("без role — fallback на projection.forRoles[0]", () => {
    const projWithRole = { ...SYNTH_PROJECTION, forRoles: ["seller"] };
    const result = computeAlternateAssignment(SYNTH_INTENTS, projWithRole, SYNTH_ONTOLOGY);
    expect(result.assignment.size).toBeGreaterThan(0);
    expect(result.metadata.role).toBe("seller");
  });

  it("использует Hungarian (default solver) — 4 primary → 3 в primaryCTA", () => {
    const fourPrimary = {
      a: { id: "a", salience: 90, particles: { entities: ["Listing"], effects: [] } },
      b: { id: "b", salience: 88, particles: { entities: ["Listing"], effects: [] } },
      c: { id: "c", salience: 86, particles: { entities: ["Listing"], effects: [] } },
      d: { id: "d", salience: 84, particles: { entities: ["Listing"], effects: [] } },
    };
    const ont = {
      entities: { Listing: { fields: {} } },
      roles: { seller: { canExecute: ["a", "b", "c", "d"] } },
    };
    const result = computeAlternateAssignment(fourPrimary, SYNTH_PROJECTION, ont, { role: "seller" });
    const inPrimary = [...result.assignment.entries()].filter(([_, s]) => s === "primaryCTA");
    expect(inPrimary).toHaveLength(3);
    expect(result.metadata.solver).toBe("hungarian");
  });

  it("opts.solver: 'greedy' — fall back на greedyAssign", () => {
    const result = computeAlternateAssignment(SYNTH_INTENTS, SYNTH_PROJECTION, SYNTH_ONTOLOGY, {
      role: "seller",
      solver: "greedy",
    });
    expect(result.metadata.solver).toBe("greedy");
    expect(result.assignment.size).toBeGreaterThan(0);
  });

  it("computes salience для intents без explicit salience", () => {
    const intentsWithoutSalience = {
      create_listing: {
        id: "create_listing",
        creates: "Listing",
        // нет explicit salience → computeSalience вернёт 80 (creator-of-main)
        particles: { entities: ["Listing"], effects: [] },
      },
    };
    const ont = {
      entities: { Listing: { fields: {} } },
      roles: { seller: { canExecute: ["create_listing"] } },
    };
    const result = computeAlternateAssignment(intentsWithoutSalience, SYNTH_PROJECTION, ont, {
      role: "seller",
    });
    // create_listing (creator-of-main, salience 80) → primaryCTA
    expect(result.assignment.get("create_listing")).toBe("primaryCTA");
  });
});
