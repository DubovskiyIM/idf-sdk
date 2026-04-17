import { describe, it, expect } from "vitest";
import { findSubEntities, buildSection, sectionIdFor } from "./subEntityHelpers.js";

describe("findSubEntities", () => {
  const ontology = {
    entities: {
      Portfolio: { fields: { name: { type: "text" } } },
      Position: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, ticker: { type: "text" } } },
      Transaction: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, amount: { type: "number" } } },
      Asset: { fields: { ticker: { type: "text" } } },   // no FK to Portfolio
    },
  };

  it("finds entities with foreignKey to mainEntity", () => {
    const subs = findSubEntities(ontology, "Portfolio");
    expect(subs.map(s => s.entity).sort()).toEqual(["Position", "Transaction"]);
    expect(subs.find(s => s.entity === "Position").fkField).toBe("portfolioId");
  });

  it("returns empty when no sub-entities", () => {
    expect(findSubEntities(ontology, "Asset")).toEqual([]);
  });

  it("result order is alphabetical by entity name", () => {
    const subs = findSubEntities(ontology, "Portfolio");
    expect(subs.map(s => s.entity)).toEqual(["Position", "Transaction"]);
  });
});

describe("buildSection", () => {
  const ontology = {
    entities: {
      Portfolio: { fields: { name: { type: "text" } } },
      Position: { fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, ticker: { type: "text" } } },
    },
  };
  const intents = [
    { id: "add_position", creates: "Position", particles: { effects: [{ α: "create", target: "position" }] } },
    { id: "remove_position", particles: { effects: [{ α: "remove", target: "position.*" }] } },
    { id: "update_poll", particles: { effects: [{ α: "replace", target: "poll.title" }] } },   // irrelevant
  ];

  it("builds section with sub-entity intents", () => {
    const section = buildSection("Position", "portfolioId", intents, ontology);
    expect(section.id).toBe("positions");
    expect(section.entity).toBe("Position");
    expect(section.foreignKey).toBe("portfolioId");
    expect(section.intents).toContain("add_position");
    expect(section.intents).toContain("remove_position");
    expect(section.intents).not.toContain("update_poll");
  });

  it("sets layout m2m for assignment entities", () => {
    const ontM2m = {
      entities: {
        Portfolio: { fields: { name: { type: "text" } } },
        Assignment: { kind: "assignment", fields: { portfolioId: { type: "foreignKey", refs: "Portfolio" }, userId: { type: "foreignKey", refs: "User" } } },
      },
    };
    const section = buildSection("Assignment", "portfolioId", [], ontM2m);
    expect(section.layout).toBe("m2m");
  });
});

describe("sectionIdFor", () => {
  it("pluralizes entity name lowercase", () => {
    expect(sectionIdFor("Position")).toBe("positions");
    expect(sectionIdFor("Transaction")).toBe("transactions");
  });
});
