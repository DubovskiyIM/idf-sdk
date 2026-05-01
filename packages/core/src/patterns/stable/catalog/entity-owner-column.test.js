import { describe, it, expect } from "vitest";
import { PATTERN } from "./entity-owner-column.js";

describe("entity-owner-column pattern", () => {
  it("apply добавляет Owner column когда entity имеет owner field", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name" }] } };
    const context = {
      projection: { mainEntity: "Metalake" },
      ontology: { entities: { Metalake: { fields: { owner: { type: "string" } } } } },
    };
    const next = PATTERN.structure.apply(slots, context);
    const ownerCol = next.body.columns.find(c => c.key === "owner");
    expect(ownerCol?.kind).toBe("ownerAvatar");
    expect(ownerCol?.editIntent).toBe("setOwner");
  });

  it("no-op когда entity не имеет owner field", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name" }] } };
    const context = { projection: { mainEntity: "User" }, ontology: { entities: { User: { fields: {} } } } };
    const next = PATTERN.structure.apply(slots, context);
    expect(next.body.columns.length).toBe(1);
  });

  it("insert перед tags column если tags есть", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name" }, { key: "tags" }] } };
    const context = {
      projection: { mainEntity: "Catalog" },
      ontology: { entities: { Catalog: { fields: { owner: { type: "string" } } } } },
    };
    const next = PATTERN.structure.apply(slots, context);
    const ownerIdx = next.body.columns.findIndex(c => c.key === "owner");
    const tagsIdx = next.body.columns.findIndex(c => c.key === "tags");
    expect(ownerIdx).toBeLessThan(tagsIdx);
  });

  it("no-op когда owner column уже есть (author override)", () => {
    const slots = { body: { type: "dataGrid", columns: [{ key: "name" }, { key: "owner" }] } };
    const context = {
      projection: { mainEntity: "Catalog" },
      ontology: { entities: { Catalog: { fields: { owner: { type: "string" } } } } },
    };
    const next = PATTERN.structure.apply(slots, context);
    expect(next.body.columns.length).toBe(2);
  });
});
