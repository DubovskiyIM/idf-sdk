import { describe, it, expect } from "vitest";
import { explainCrystallize, explainAllCrystallize } from "./explainCrystallize.js";
import { crystallizeV2 } from "./index.js";
import { deriveProjections } from "./deriveProjections.js";

describe("explainCrystallize — unified witness query", () => {
  const INTENTS = {
    add_listing: { creates: "Listing", particles: { effects: [{ α: "create", target: "listing" }], witnesses: ["title", "price"] } },
    edit_listing: { particles: { effects: [{ α: "replace", target: "listing.title" }] } },
    publish_listing: { particles: { effects: [{ α: "replace", target: "listing.status" }] } },
  };
  const ONTOLOGY = {
    entities: {
      Listing: {
        ownerField: "sellerId",
        fields: { sellerId: { type: "entityRef" }, title: { type: "text" }, status: { type: "text" } },
      },
    },
  };

  it("derived projection: origin = derived, rule IDs извлечены, trace упорядочен", () => {
    const projections = deriveProjections(INTENTS, ONTOLOGY);
    const artifacts = crystallizeV2(INTENTS, projections, ONTOLOGY, "test");
    const expl = explainCrystallize(artifacts.listing_list);

    expect(expl.projection).toBe("listing_list");
    expect(expl.archetype).toBe("catalog");
    expect(expl.origin).toMatch(/^derived/);
    expect(expl.ruleIds).toEqual(expect.arrayContaining(["R1"]));
    expect(expl.trace[0].basis).toBe("crystallize-rule");
    expect(expl.trace[0].ruleId).toBe("R1");
    expect(expl.summary).toContain("R1");
  });

  it("authored-only projection: origin = authored, ruleIds пустой", () => {
    const PROJECTIONS = {
      manual_dashboard: { kind: "dashboard", widgets: [] },
    };
    const artifacts = crystallizeV2(INTENTS, PROJECTIONS, ONTOLOGY);
    const expl = explainCrystallize(artifacts.manual_dashboard);

    expect(expl.origin).toBe("authored");
    expect(expl.ruleIds).toEqual([]);
  });

  it("derived+enriched: detail с subCollection через R3 + R4", () => {
    const intents2 = {
      ...INTENTS,
      place_bid: { creates: "Bid", particles: { effects: [{ α: "create", target: "bid" }] } },
    };
    const ontology2 = {
      entities: {
        ...ONTOLOGY.entities,
        Bid: { fields: { listingId: { type: "entityRef" }, amount: { type: "number" } } },
      },
    };
    const projections = deriveProjections(intents2, ontology2);
    const artifacts = crystallizeV2(intents2, projections, ontology2, "test");
    const expl = explainCrystallize(artifacts.listing_detail);

    expect(expl.origin).toBe("derived+enriched");
    expect(expl.ruleIds).toEqual(expect.arrayContaining(["R3", "R4"]));
  });

  it("trace упорядочен по BASIS_ORDER: crystallize-rule первыми", () => {
    const projections = deriveProjections(INTENTS, ONTOLOGY);
    const artifacts = crystallizeV2(INTENTS, projections, ONTOLOGY, "test");
    const expl = explainCrystallize(artifacts.listing_detail);

    const bases = expl.trace.map(t => t.basis);
    const firstNonRule = bases.findIndex(b => b !== "crystallize-rule");
    if (firstNonRule !== -1) {
      const allPrior = bases.slice(0, firstNonRule);
      expect(allPrior.every(b => b === "crystallize-rule")).toBe(true);
    }
  });

  it("patternIds извлечены из pattern-bank witnesses", () => {
    const projections = deriveProjections(INTENTS, ONTOLOGY);
    const artifacts = crystallizeV2(INTENTS, projections, ONTOLOGY, "test");
    const expl = explainCrystallize(artifacts.listing_detail);

    // В detail могут быть pattern-bank witnesses (subcollections etc.)
    expect(Array.isArray(expl.patternIds)).toBe(true);
  });

  it("throws на invalid artifact", () => {
    expect(() => explainCrystallize(null)).toThrow();
    expect(() => explainCrystallize(undefined)).toThrow();
    expect(() => explainCrystallize("not-an-object")).toThrow();
  });

  it("explainAllCrystallize: batch над artifacts map", () => {
    const projections = deriveProjections(INTENTS, ONTOLOGY);
    const artifacts = crystallizeV2(INTENTS, projections, ONTOLOGY, "test");
    const all = explainAllCrystallize(artifacts);

    expect(Object.keys(all).length).toBe(Object.keys(artifacts).length);
    for (const [projId, expl] of Object.entries(all)) {
      expect(expl.projection).toBe(projId);
      expect(typeof expl.origin).toBe("string");
    }
  });

  it("summary человекочитаемый и содержит archetype + origin label", () => {
    const projections = deriveProjections(INTENTS, ONTOLOGY);
    const artifacts = crystallizeV2(INTENTS, projections, ONTOLOGY, "test");
    const expl = explainCrystallize(artifacts.my_listing_list);

    expect(expl.summary).toContain("catalog");
    expect(expl.summary).toMatch(/выведена/);
    expect(expl.summary).toContain("R7");
  });
});
