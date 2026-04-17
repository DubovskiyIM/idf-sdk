import { describe, it, expect } from "vitest";
import subcollections from "./subcollections.js";

const ontology = {
  entities: {
    Portfolio: { fields: { name: { type: "text" } } },
    Position: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, ticker: { type: "text" } } },
    Transaction: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, amount: { type: "number" } } },
  },
};
const intents = [
  { id: "add_position", creates: "Position", particles: { effects: [{ α: "create", target: "position" }] } },
  { id: "add_tx", creates: "Transaction", particles: { effects: [{ α: "create", target: "transaction" }] } },
];

describe("subcollections.structure.apply", () => {
  it("adds sections for sub-entities", () => {
    const slots = {};
    const context = { ontology, mainEntity: "Portfolio", intents };
    const result = subcollections.structure.apply(slots, context);
    expect(result.sections).toHaveLength(2);
    expect(result.sections.map(s => s.id).sort()).toEqual(["positions", "transactions"]);
  });

  it("idempotent — second call adds nothing", () => {
    const slots = {};
    const context = { ontology, mainEntity: "Portfolio", intents };
    const once = subcollections.structure.apply(slots, context);
    const twice = subcollections.structure.apply(once, context);
    expect(twice.sections).toHaveLength(once.sections.length);
  });

  it("preserves existing sections with same id", () => {
    const slots = { sections: [{ id: "positions", title: "Custom positions", source: "authored" }] };
    const context = { ontology, mainEntity: "Portfolio", intents };
    const result = subcollections.structure.apply(slots, context);
    const positions = result.sections.find(s => s.id === "positions");
    expect(positions.source).toBe("authored");
    expect(positions.title).toBe("Custom positions");
    expect(result.sections.find(s => s.id === "transactions")).toBeDefined();
  });

  it("returns same slots object when nothing to add", () => {
    const slots = { sections: [] };
    const context = { ontology: { entities: { X: {} } }, mainEntity: "X", intents: [] };
    const result = subcollections.structure.apply(slots, context);
    expect(result).toBe(slots);
  });

  it("does not mutate input slots", () => {
    const slots = Object.freeze({ sections: Object.freeze([]) });
    const context = { ontology, mainEntity: "Portfolio", intents };
    expect(() => subcollections.structure.apply(slots, context)).not.toThrow();
  });

  it("sets layout:m2m for assignment entities", () => {
    const ontM2m = {
      entities: {
        Portfolio: { fields: { name: { type: "text" } } },
        Assignment: { kind: "assignment", fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, userId: { type: "foreignKey", refs: "User" } } },
      },
    };
    const slots = {};
    const result = subcollections.structure.apply(slots, { ontology: ontM2m, mainEntity: "Portfolio", intents: [] });
    const assignments = result.sections.find(s => s.id === "assignments");
    expect(assignments.layout).toBe("m2m");
  });

  it("author curation — projection.subCollections задан → apply no-op", () => {
    const slots = { sections: [] };
    const projection = {
      mainEntity: "Portfolio",
      subCollections: [{ entity: "Position" }],
    };
    const result = subcollections.structure.apply(slots, {
      ontology,
      mainEntity: "Portfolio",
      intents,
      projection,
    });
    // apply не должен добавить Transaction — автор зафиксировал curated список.
    expect(result).toBe(slots);
  });

  it("empty projection.subCollections — НЕ считается curated (apply отрабатывает)", () => {
    const slots = {};
    const projection = { mainEntity: "Portfolio", subCollections: [] };
    const result = subcollections.structure.apply(slots, {
      ontology,
      mainEntity: "Portfolio",
      intents,
      projection,
    });
    expect(result.sections).toHaveLength(2);
  });
});
