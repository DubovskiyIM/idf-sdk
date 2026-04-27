import { describe, it, expect } from "vitest";
import {
  getDefaultSlotsForArchetype,
  computeAlternateAssignment,
} from "./jointSolverBridge.js";

describe("getDefaultSlotsForArchetype (Phase 3c' empirical model)", () => {
  it("catalog → hero/overlay/toolbar (Phase 5: overlay before toolbar в overflow)", () => {
    const slots = getDefaultSlotsForArchetype("catalog");
    expect(Object.keys(slots)).toEqual(["hero", "overlay", "toolbar"]);
    expect(slots.hero.capacity).toBe(2);
    expect(slots.overlay.capacity).toBe(9);
    expect(slots.toolbar.capacity).toBe(5);
    expect(slots.hero.allowedRoles).toContain("primary");
    expect(slots.toolbar.allowedRoles).toContain("navigation");
    expect(slots.overlay.allowedRoles).toContain("destructive");
  });

  it("detail → primaryCTA/overlay/toolbar/footer (Phase 5: overflow reordered)", () => {
    const slots = getDefaultSlotsForArchetype("detail");
    expect(Object.keys(slots)).toEqual(["primaryCTA", "overlay", "toolbar", "footer"]);
    expect(slots.primaryCTA.capacity).toBe(10);
    expect(slots.overlay.capacity).toBe(9);
    expect(slots.toolbar.capacity).toBe(3);
    expect(slots.footer.capacity).toBe(35);
    expect(slots.primaryCTA.allowedRoles).toContain("destructive");
  });

  it("feed → toolbar/overlay (без hero)", () => {
    const slots = getDefaultSlotsForArchetype("feed");
    expect("toolbar" in slots).toBe(true);
    expect("overlay" in slots).toBe(true);
    expect("hero" in slots).toBe(false);
    expect(slots.overlay.capacity).toBe(14);
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
    // creator-of-mainEntity → passes appliesToProjection (rule 2)
    particles: { entities: ["Listing"], effects: [{ α: "add", target: "Listing" }] },
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
    // search-utility — passes appliesToProjection (rule 1) с witness "query"
    particles: { entities: ["Listing"], effects: [{ α: "replace", target: "Listing.viewedAt" }], witnesses: ["query"] },
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
  it("извлекает intents через accessibleIntents и распределяет по empirical defaults", () => {
    const result = computeAlternateAssignment(SYNTH_INTENTS, SYNTH_PROJECTION, SYNTH_ONTOLOGY, {
      role: "seller",
    });
    expect(result.assignment.size).toBeGreaterThan(0);
    // Phase 3c' (empirical): primaryCTA первый в slot order →
    // primary intent (salience 80) попадает туда первым.
    expect(result.assignment.get("create_listing")).toBe("primaryCTA");
    // Все 4 intent'а fit в primaryCTA(10) или toolbar(3) — один из этих slots.
    const validSlots = ["primaryCTA", "toolbar", "overlay", "footer"];
    for (const id of ["edit_listing", "delete_listing", "view_history"]) {
      expect(validSlots).toContain(result.assignment.get(id));
    }
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
    // Phase 3c' empirical detail slots
    expect(result.metadata.slotNames).toEqual(["primaryCTA", "overlay", "toolbar", "footer"]);
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

  it("использует Hungarian (default solver) — 4 primary fit в primaryCTA(capacity 10)", () => {
    const fourPrimary = {
      a: { id: "a", salience: 90, particles: { entities: ["Listing"], effects: [{ α: "replace", target: "Listing.x" }] } },
      b: { id: "b", salience: 88, particles: { entities: ["Listing"], effects: [{ α: "replace", target: "Listing.y" }] } },
      c: { id: "c", salience: 86, particles: { entities: ["Listing"], effects: [{ α: "replace", target: "Listing.z" }] } },
      d: { id: "d", salience: 84, particles: { entities: ["Listing"], effects: [{ α: "replace", target: "Listing.w" }] } },
    };
    const ont = {
      entities: { Listing: { fields: {} } },
      roles: { seller: { canExecute: ["a", "b", "c", "d"] } },
    };
    const result = computeAlternateAssignment(fourPrimary, SYNTH_PROJECTION, ont, { role: "seller" });
    // Phase 3c' empirical detail/primaryCTA capacity = 10 → все 4 primary fit здесь
    const inPrimary = [...result.assignment.entries()].filter(([_, s]) => s === "primaryCTA");
    expect(inPrimary).toHaveLength(4);
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
        // creator-of-main → passes appliesToProjection
        particles: { entities: ["Listing"], effects: [{ α: "add", target: "Listing" }] },
      },
    };
    const ont = {
      entities: { Listing: { fields: {} } },
      roles: { seller: { canExecute: ["create_listing"] } },
    };
    const result = computeAlternateAssignment(intentsWithoutSalience, SYNTH_PROJECTION, ont, {
      role: "seller",
    });
    // Phase 6: creator-of-mainEntity (intent.creates === 'Listing') —
    // declarative author signal, auto-promote в primary tier даже без
    // explicit intent.salience.
    expect(result.assignment.get("create_listing")).toBe("primaryCTA");
  });
});
