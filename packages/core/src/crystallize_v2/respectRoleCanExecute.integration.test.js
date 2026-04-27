import { describe, it, expect } from "vitest";
import { assignToSlotsCatalog } from "./assignToSlotsCatalog.js";
import { assignToSlotsDetail } from "./assignToSlotsDetail.js";

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
  view_listing: {
    id: "view_listing",
    salience: 20,
    particles: { entities: ["Listing"], effects: [] },
  },
  delete_listing: {
    id: "delete_listing",
    salience: 30,
    particles: { entities: ["Listing"], effects: [{ α: "remove", target: "Listing" }] },
    permittedFor: ["admin"],
  },
};

const ONTOLOGY = {
  entities: { Listing: { fields: { id: { type: "string" }, title: { type: "string" } } } },
  roles: {
    seller: { canExecute: ["create_listing", "edit_listing"] },
    buyer:  { canExecute: ["view_listing"] },
  },
};

const PROJ_DETAIL = { id: "listing_detail", mainEntity: "Listing", archetype: "detail" };
const PROJ_CATALOG = { id: "listing_catalog", mainEntity: "Listing", archetype: "catalog" };

describe("assignToSlotsDetail — Phase 3d.1 respectRoleCanExecute opt-in", () => {
  it("default false — не throws, returns slots structure (backward-compat)", () => {
    const slots = assignToSlotsDetail(INTENTS, PROJ_DETAIL, ONTOLOGY, null, {
      role: "seller",
    });
    // Backward-compat: assignToSlotsDetail работает как раньше — return slots object.
    // Существующие detail-specific filters (creates → catalog only, IB whitelist,
    // appliesToProjection) не модифицируются Phase 3d.
    expect(slots).toBeDefined();
    expect(typeof slots).toBe("object");
  });

  it("respectRoleCanExecute: true — pre-filter intents через role.canExecute", () => {
    const slots = assignToSlotsDetail(INTENTS, PROJ_DETAIL, ONTOLOGY, null, {
      role: "seller",
      respectRoleCanExecute: true,
    });
    const ids = new Set();
    for (const nodes of Object.values(slots)) {
      if (!Array.isArray(nodes)) continue;
      for (const n of nodes) if (n?.intentId) ids.add(n.intentId);
    }
    // seller.canExecute = ['create_listing', 'edit_listing']
    // delete_listing и view_listing не должны попасть
    expect(ids.has("delete_listing")).toBe(false);
    expect(ids.has("view_listing")).toBe(false);
    // create_listing и edit_listing — могут попасть (если особые conditions не fail'ят)
  });

  it("default false + witnesses collector — emit role-canExecute-violation witnesses", () => {
    const witnesses = [];
    assignToSlotsDetail(INTENTS, PROJ_DETAIL, ONTOLOGY, null, {
      role: "buyer",
      witnesses,
    });
    const violations = witnesses.filter((w) => w?.basis === "role-canExecute-violation");
    expect(violations.length).toBeGreaterThan(0);
    // buyer не имеет в canExecute create_listing, edit_listing, delete_listing
    const violatedIds = violations.map((v) => v.intentId);
    expect(violatedIds).toContain("create_listing");
    expect(violatedIds).toContain("edit_listing");
    expect(violatedIds).toContain("delete_listing");
  });

  it("respectRoleCanExecute: true — НЕ emit role-canExecute-violation witness (фильтр сработал)", () => {
    const witnesses = [];
    assignToSlotsDetail(INTENTS, PROJ_DETAIL, ONTOLOGY, null, {
      role: "seller",
      witnesses,
      respectRoleCanExecute: true,
    });
    const violations = witnesses.filter((w) => w?.basis === "role-canExecute-violation");
    expect(violations.length).toBe(0);
  });

  it("permittedFor blocked — witness reason 'both' для buyer/delete_listing", () => {
    const witnesses = [];
    assignToSlotsDetail(INTENTS, PROJ_DETAIL, ONTOLOGY, null, {
      role: "buyer",
      witnesses,
    });
    const v = witnesses.find((w) => w?.basis === "role-canExecute-violation" && w.intentId === "delete_listing");
    expect(v).toBeDefined();
    // buyer не в canExecute и не в permittedFor → 'both'
    expect(v.reason).toBe("both");
  });
});

describe("assignToSlotsCatalog — Phase 3d.1 respectRoleCanExecute opt-in", () => {
  it("default false — backward-compat", () => {
    const slots = assignToSlotsCatalog(INTENTS, PROJ_CATALOG, ONTOLOGY, null, "default", {
      role: "seller",
    });
    expect(slots).toBeDefined();
  });

  it("respectRoleCanExecute: true — pre-filter intents", () => {
    const witnesses = [];
    assignToSlotsCatalog(INTENTS, PROJ_CATALOG, ONTOLOGY, null, "default", {
      role: "buyer",
      witnesses,
      respectRoleCanExecute: true,
    });
    // buyer.canExecute = ['view_listing'] — ничего не должно попасть в violation
    const violations = witnesses.filter((w) => w?.basis === "role-canExecute-violation");
    expect(violations.length).toBe(0);
  });

  it("witness archetype: 'catalog'", () => {
    const witnesses = [];
    assignToSlotsCatalog(INTENTS, PROJ_CATALOG, ONTOLOGY, null, "default", {
      role: "buyer",
      witnesses,
    });
    const violations = witnesses.filter((w) => w?.basis === "role-canExecute-violation");
    if (violations.length > 0) {
      expect(violations[0].archetype).toBe("catalog");
    }
  });
});
