import { describe, it, expect } from "vitest";
import pattern from "./catalog-exclude-self-owned.js";
import { validatePattern, evaluateTriggerExplained } from "../../schema.js";

describe("catalog-exclude-self-owned (§6.6)", () => {
  it("passes schema validation", () => {
    expect(() => validatePattern(pattern)).not.toThrow();
  });

  it("matches: catalog + ownerField", () => {
    const intents = [];
    const ontology = { entities: { Listing: { ownerField: "sellerId", fields: {} } } };
    const projection = { kind: "catalog", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, intents, ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("matches: catalog + owners:[a,b]", () => {
    const ontology = { entities: { Deal: { owners: ["customerId", "executorId"], fields: {} } } };
    const projection = { kind: "catalog", mainEntity: "Deal" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(true);
  });

  it("NOT matches: detail projection", () => {
    const ontology = { entities: { Listing: { ownerField: "sellerId", fields: {} } } };
    const projection = { kind: "detail", mainEntity: "Listing" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: нет ownerField", () => {
    const ontology = { entities: { Tag: { fields: {} } } };
    const projection = { kind: "catalog", mainEntity: "Tag" };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("NOT matches: projection.excludeSelfOwned=false", () => {
    const ontology = { entities: { Listing: { ownerField: "sellerId", fields: {} } } };
    const projection = { kind: "catalog", mainEntity: "Listing", excludeSelfOwned: false };
    const res = evaluateTriggerExplained(pattern.trigger, [], ontology, projection);
    expect(res.ok).toBe(false);
  });

  it("apply: single ownerField → body.excludeSelfOwned={field}", () => {
    const slots = { body: {} };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "catalog", mainEntity: "Listing" },
      ontology: { entities: { Listing: { ownerField: "sellerId", fields: {} } } },
    });
    expect(next.body.excludeSelfOwned).toEqual({ field: "sellerId" });
  });

  it("apply: multi-owner → body.excludeSelfOwned={fields}", () => {
    const slots = { body: {} };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "catalog", mainEntity: "Deal" },
      ontology: { entities: { Deal: { owners: ["customerId", "executorId"], fields: {} } } },
    });
    expect(next.body.excludeSelfOwned).toEqual({ fields: ["customerId", "executorId"] });
  });

  it("apply idempotent: body.excludeSelfOwned уже задан → no-op", () => {
    const slots = { body: { excludeSelfOwned: { field: "authoredField" } } };
    const next = pattern.structure.apply(slots, {
      projection: { kind: "catalog", mainEntity: "Listing" },
      ontology: { entities: { Listing: { ownerField: "sellerId", fields: {} } } },
    });
    expect(next).toBe(slots);
  });
});
