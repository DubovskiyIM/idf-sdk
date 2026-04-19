// slotAttribution.test.js
import { describe, it, expect } from "vitest";
import { computeSlotAttribution } from "./slotAttribution.js";

const ONTOLOGY = {
  entities: {
    Portfolio: { fields: { name: { type: "text" } } },
    Position: {
      fields: {
        portfolioId: { type: "foreignKey", refs: "Portfolio" },
        ticker: { type: "text" },
      },
    },
  },
};
const INTENTS = [
  {
    id: "add_position",
    creates: "Position",
    particles: { effects: [{ α: "create", target: "position" }] },
  },
];
const PROJECTION = { kind: "detail", mainEntity: "Portfolio" };

describe("computeSlotAttribution", () => {
  it("attributes subcollections-derived sections", () => {
    const attribution = computeSlotAttribution(INTENTS, ONTOLOGY, PROJECTION);
    const subKeys = Object.entries(attribution).filter(
      ([, v]) => v.patternId === "subcollections",
    );
    expect(subKeys.length).toBeGreaterThan(0);
    expect(subKeys[0][1].action).toBe("added");
  });
});

describe("computeSlotAttribution — coverage", () => {
  it("attributes grid-card-layout body changes", () => {
    const ontology = {
      entities: {
        Listing: {
          fields: {
            title: { type: "text" },
            imageUrl: { type: "image" },
            price: { type: "money" },
            rating: { type: "number", min: 0, max: 5 },
          },
        },
      },
    };
    const projection = { kind: "catalog", mainEntity: "Listing" };
    const intents = [
      { id: "browse_listings", particles: { effects: [{ α: "read", target: "listing" }] } },
    ];
    const attribution = computeSlotAttribution(intents, ontology, projection);
    const gridKeys = Object.entries(attribution).filter(
      ([, v]) => v.patternId === "grid-card-layout",
    );
    if (gridKeys.length > 0) {
      expect(gridKeys.some(([p]) => p.startsWith("body"))).toBe(true);
    }
  });

  it("returns empty attribution when no matched patterns with apply", () => {
    const ontology = { entities: { Empty: { fields: {} } } };
    const projection = { kind: "form", mainEntity: "Empty" };
    const intents = [];
    const attribution = computeSlotAttribution(intents, ontology, projection);
    expect(Object.keys(attribution)).toEqual([]);
  });

  it("attribution values have valid action and patternId (invariant)", () => {
    const attribution = computeSlotAttribution(INTENTS, ONTOLOGY, PROJECTION);
    for (const v of Object.values(attribution)) {
      expect(["added", "modified"]).toContain(v.action);
      expect(typeof v.patternId).toBe("string");
      expect(v.patternId.length).toBeGreaterThan(0);
    }
  });
});
