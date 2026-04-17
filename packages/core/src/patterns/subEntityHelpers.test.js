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

  it("consonant+y → ies", () => {
    expect(sectionIdFor("Delivery")).toBe("deliveries");
    expect(sectionIdFor("Category")).toBe("categories");
    expect(sectionIdFor("Story")).toBe("stories");
  });

  it("ends in is → es", () => {
    expect(sectionIdFor("Hypothesis")).toBe("hypotheses");
    expect(sectionIdFor("Analysis")).toBe("analyses");
  });

  it("ends in s/x/z/ch/sh → +es", () => {
    expect(sectionIdFor("Box")).toBe("boxes");
    expect(sectionIdFor("Bus")).toBe("buses");
    expect(sectionIdFor("Match")).toBe("matches");
    expect(sectionIdFor("Dish")).toBe("dishes");
  });

  it("vowel+y → +s (не ies)", () => {
    expect(sectionIdFor("Survey")).toBe("surveys");
    expect(sectionIdFor("Key")).toBe("keys");
  });

  it("review / payment / portfolio — regular +s", () => {
    expect(sectionIdFor("Review")).toBe("reviews");
    expect(sectionIdFor("Payment")).toBe("payments");
    expect(sectionIdFor("Portfolio")).toBe("portfolios");
  });
});

describe("findSubEntities — last camelCase-segment FK", () => {
  const reflectLike = {
    entities: {
      MoodEntry: {
        fields: { id: { type: "text" }, userId: { type: "text" } },
      },
      HypothesisEvidence: {
        fields: {
          id: { type: "text" },
          entryId: { type: "text" },   // last-segment convention
        },
      },
      EntryActivity: {
        kind: "assignment",
        fields: {
          id: { type: "text" },
          entryId: { type: "text" },
          activityId: { type: "text" },
        },
      },
      Unrelated: {
        fields: { id: { type: "text" } },
      },
    },
  };

  it("finds entities via last camelCase-segment + Id convention (MoodEntry → entryId)", () => {
    const subs = findSubEntities(reflectLike, "MoodEntry");
    expect(subs.map(s => s.entity).sort()).toEqual(["EntryActivity", "HypothesisEvidence"]);
    expect(subs.find(s => s.entity === "HypothesisEvidence").fkField).toBe("entryId");
    expect(subs.find(s => s.entity === "EntryActivity").fkField).toBe("entryId");
  });

  it("не находит entities без FK-match (Unrelated)", () => {
    const subs = findSubEntities(reflectLike, "MoodEntry");
    expect(subs.find(s => s.entity === "Unrelated")).toBeUndefined();
  });

  it("single-segment entity — только <mainLower>Id candidate", () => {
    const ont = {
      entities: {
        Portfolio: { fields: { id: {} } },
        Position: { fields: { portfolioId: {} } },
        // Нет entity с fkField = "portfolioId" по last-segment — single segment.
      },
    };
    const subs = findSubEntities(ont, "Portfolio");
    expect(subs.map(s => s.entity)).toEqual(["Position"]);
  });
});
