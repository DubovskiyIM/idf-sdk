import { describe, it, expect } from "vitest";
import { PATTERN } from "./entity-tag-policy-columns.js";

describe("entity-tag-policy-columns pattern", () => {
  it("apply добавляет Tags + Policies columns когда entity имеет оба field'а", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name" }, { key: "comment" }] } };
    const context = {
      projection: { mainEntity: "Catalog" },
      ontology: { entities: { Catalog: { fields: { tags: { type: "array" }, policies: { type: "array" } } } } },
    };
    const next = PATTERN.structure.apply(slots, context);
    expect(next.body.columns.find(c => c.key === "tags")?.kind).toBe("chipAssociation");
    expect(next.body.columns.find(c => c.key === "policies")?.kind).toBe("chipAssociation");
  });

  it("no-op когда entity не имеет tags/policies", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name" }] } };
    const context = { projection: { mainEntity: "User" }, ontology: { entities: { User: { fields: {} } } } };
    const next = PATTERN.structure.apply(slots, context);
    expect(next.body.columns.length).toBe(1);
  });

  it("no-op когда tags column уже есть (author override)", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name" }, { key: "tags" }] } };
    const context = {
      projection: { mainEntity: "Catalog" },
      ontology: { entities: { Catalog: { fields: { tags: { type: "array" }, policies: { type: "array" } } } } },
    };
    const next = PATTERN.structure.apply(slots, context);
    // tags уже был, добавится только policies
    expect(next.body.columns.length).toBe(3);
    expect(next.body.columns.filter(c => c.key === "tags").length).toBe(1);
  });

  it("insert после name column", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name" }, { key: "comment" }] } };
    const context = {
      projection: { mainEntity: "Catalog" },
      ontology: { entities: { Catalog: { fields: { tags: { type: "array" }, policies: { type: "array" } } } } },
    };
    const next = PATTERN.structure.apply(slots, context);
    const keys = next.body.columns.map(c => c.key);
    expect(keys).toEqual(["name", "tags", "policies", "comment"]);
  });
});
