import { describe, it, expect } from "vitest";
import {
  filterIntentsByRoleCanExecute,
  detectCanExecuteViolations,
  buildCanExecuteViolationWitness,
} from "./respectRoleCanExecute.js";

const ONTOLOGY = {
  roles: {
    seller: { canExecute: ["create_listing", "edit_listing"] },
    buyer:  { canExecute: ["view_listing"] },
    admin:  { /* no canExecute — sees all */ },
  },
};

const INTENTS = {
  create_listing: { id: "create_listing", particles: { entities: ["Listing"] } },
  edit_listing:   { id: "edit_listing", particles: { entities: ["Listing"] } },
  view_listing:   { id: "view_listing", particles: { entities: ["Listing"] } },
  delete_listing: {
    id: "delete_listing",
    particles: { entities: ["Listing"] },
    permittedFor: ["admin"],
  },
};

describe("filterIntentsByRoleCanExecute", () => {
  it("seller — только create_listing + edit_listing (по canExecute)", () => {
    const filtered = filterIntentsByRoleCanExecute(INTENTS, "seller", ONTOLOGY);
    expect(Object.keys(filtered).sort()).toEqual(["create_listing", "edit_listing"]);
  });

  it("buyer — только view_listing", () => {
    const filtered = filterIntentsByRoleCanExecute(INTENTS, "buyer", ONTOLOGY);
    expect(Object.keys(filtered)).toEqual(["view_listing"]);
  });

  it("admin без canExecute — видит всё (no-op)", () => {
    const filtered = filterIntentsByRoleCanExecute(INTENTS, "admin", ONTOLOGY);
    expect(Object.keys(filtered).sort()).toEqual(Object.keys(INTENTS).sort());
  });

  it("undefined role — INTENTS as-is (no-op)", () => {
    const filtered = filterIntentsByRoleCanExecute(INTENTS, "ghost", ONTOLOGY);
    expect(filtered).toBe(INTENTS);
  });

  it("permittedFor — secondary check (delete_listing для seller)", () => {
    // Если seller добавили delete_listing в canExecute — но permittedFor:["admin"]
    const onto = { roles: { seller: { canExecute: [...ONTOLOGY.roles.seller.canExecute, "delete_listing"] } } };
    const filtered = filterIntentsByRoleCanExecute(INTENTS, "seller", onto);
    expect(filtered.delete_listing).toBeUndefined();
    expect(filtered.create_listing).toBeDefined();
  });

  it("null role — no filtering", () => {
    expect(filterIntentsByRoleCanExecute(INTENTS, null, ONTOLOGY)).toBe(INTENTS);
  });
});

describe("detectCanExecuteViolations", () => {
  it("seller — violations это все intents кроме canExecute", () => {
    const violations = detectCanExecuteViolations(INTENTS, "seller", ONTOLOGY);
    const ids = violations.map((v) => v.intentId).sort();
    expect(ids).toEqual(["delete_listing", "view_listing"]);
  });

  it("violations отмечают reason 'canExecute'", () => {
    const violations = detectCanExecuteViolations(INTENTS, "buyer", ONTOLOGY);
    const v = violations.find((x) => x.intentId === "create_listing");
    expect(v.reason).toBe("canExecute");
  });

  it("permittedFor blocked → reason 'permittedFor'", () => {
    // seller получает delete_listing в canExecute, но permittedFor:["admin"]
    const onto = { roles: { seller: { canExecute: ["create_listing", "edit_listing", "delete_listing"] } } };
    const violations = detectCanExecuteViolations(INTENTS, "seller", onto);
    const v = violations.find((x) => x.intentId === "delete_listing");
    expect(v.reason).toBe("permittedFor");
  });

  it("blocked by both — reason 'both'", () => {
    // buyer не имеет delete_listing в canExecute (block 1), и permittedFor:["admin"] (block 2)
    const violations = detectCanExecuteViolations(INTENTS, "buyer", ONTOLOGY);
    const v = violations.find((x) => x.intentId === "delete_listing");
    expect(v.reason).toBe("both");
  });

  it("admin без canExecute — нет violations (no-op filter)", () => {
    const violations = detectCanExecuteViolations(INTENTS, "admin", ONTOLOGY);
    expect(violations).toEqual([]);
  });
});

describe("buildCanExecuteViolationWitness", () => {
  it("создаёт witness с правильным shape", () => {
    const w = buildCanExecuteViolationWitness({
      intentId: "delete_listing",
      role: "buyer",
      archetype: "detail",
      projectionId: "listing_detail",
      reason: "canExecute",
    });
    expect(w.basis).toBe("role-canExecute-violation");
    expect(w.reliability).toBe("rule-based");
    expect(w.intentId).toBe("delete_listing");
    expect(w.role).toBe("buyer");
    expect(w.archetype).toBe("detail");
    expect(w.projection).toBe("listing_detail");
    expect(w.reason).toBe("canExecute");
    expect(w.message).toContain("buyer");
    expect(w.message).toContain("canExecute");
    expect(w.recommendation).toBeTruthy();
  });

  it("message варьируется по reason", () => {
    const wCanExec = buildCanExecuteViolationWitness({
      intentId: "x", role: "r", archetype: "detail", projectionId: "p", reason: "canExecute",
    });
    const wPermitted = buildCanExecuteViolationWitness({
      intentId: "x", role: "r", archetype: "detail", projectionId: "p", reason: "permittedFor",
    });
    const wBoth = buildCanExecuteViolationWitness({
      intentId: "x", role: "r", archetype: "detail", projectionId: "p", reason: "both",
    });
    expect(wCanExec.message).toContain("canExecute");
    expect(wPermitted.message).toContain("permittedFor");
    expect(wBoth.message).toContain("canExecute");
    expect(wBoth.message).toContain("permittedFor");
  });
});
