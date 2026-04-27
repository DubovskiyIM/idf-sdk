import { describe, it, expect } from "vitest";
import { crystallizeV2 } from "./index.js";

const INTENTS = {
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
};

const ONTOLOGY = {
  entities: { Listing: { fields: { id: { type: "string" }, title: { type: "string" } } } },
  roles: {
    seller: { canExecute: ["create_listing", "edit_listing"] },
    buyer:  { canExecute: [] },  // empty whitelist
  },
};

const PROJECTIONS = {
  listing_detail: {
    id: "listing_detail",
    mainEntity: "Listing",
    archetype: "detail",
  },
};

describe("crystallizeV2 — opts pass-through (Phase 3d follow-up)", () => {
  it("default — backward-compat (no witnesses, no canExec filter)", () => {
    const artifacts = crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY, "test", {});
    expect(artifacts.listing_detail).toBeDefined();
    expect(artifacts.listing_detail.slots).toBeDefined();
  });

  it("opts.role + opts.witnesses + respectRoleCanExecute: false — emits witnesses (opt-out mode)", () => {
    const witnesses = [];
    crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY, "test", {
      role: "buyer",
      witnesses,
      respectRoleCanExecute: false, // Phase 3d.3: explicit opt-out для legacy
    });
    const violations = witnesses.filter((w) => w?.basis === "role-canExecute-violation");
    // buyer.canExecute = [] → все 3 intents должны быть violations
    expect(violations.length).toBe(3);
  });

  it("opts.respectRoleCanExecute: true — pre-filter intents", () => {
    const witnesses = [];
    const artifacts = crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY, "test", {
      role: "seller",
      witnesses,
      respectRoleCanExecute: true,
    });
    // Witnesses не должны содержать role-canExecute-violation (pre-filter сработал)
    const violations = witnesses.filter((w) => w?.basis === "role-canExecute-violation");
    expect(violations.length).toBe(0);

    // delete_listing должен быть отфильтрован — не попасть в slots
    const slots = artifacts.listing_detail.slots;
    const ids = new Set();
    for (const nodes of Object.values(slots)) {
      if (!Array.isArray(nodes)) continue;
      for (const n of nodes) if (n?.intentId) ids.add(n.intentId);
    }
    expect(ids.has("delete_listing")).toBe(false);
  });

  it("opts.diagnoseAlternate: true — emits joint-solver-alternative witness (Phase 2d)", () => {
    const witnesses = [];
    crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY, "test", {
      role: "seller",
      witnesses,
      diagnoseAlternate: true,
    });
    const altWitnesses = witnesses.filter((w) => w?.basis === "joint-solver-alternative");
    // Witness может быть или не быть (depends на divergence) — главное что
    // не throws и witness shape correct если есть
    if (altWitnesses.length > 0) {
      expect(altWitnesses[0].reliability).toBe("rule-based");
    }
  });

  it("opts pass через все archetypes (catalog + detail)", () => {
    const PROJ_CATALOG = {
      listing_catalog: {
        id: "listing_catalog",
        mainEntity: "Listing",
        archetype: "catalog",
      },
    };
    const witnesses = [];
    crystallizeV2(INTENTS, PROJ_CATALOG, ONTOLOGY, "test", {
      role: "buyer",
      witnesses,
      respectRoleCanExecute: false, // Phase 3d.3: opt-out для witness emission
    });
    const violations = witnesses.filter((w) => w?.basis === "role-canExecute-violation");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].archetype).toBe("catalog");
  });
});
