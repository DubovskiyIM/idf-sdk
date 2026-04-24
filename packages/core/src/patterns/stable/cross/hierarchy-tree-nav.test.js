import { describe, it, expect } from "vitest";
import pattern from "./hierarchy-tree-nav.js";

const gravitinoOntology = {
  features: { hierarchyTreeNav: true },
  entities: {
    Metalake: { fields: { id: { type: "text" } } },
    Catalog: { fields: { id: { type: "text" }, metalakeId: { type: "entityRef" } } },
    Schema: { fields: { id: { type: "text" }, catalogId: { type: "entityRef" } } },
    Table: { fields: { id: { type: "text" }, schemaId: { type: "entityRef" } } },
  },
};

describe("hierarchy-tree-nav.structure.apply", () => {
  it("строит levels для Metalake → Catalog → Schema → Table", () => {
    const slots = { sidebar: [] };
    const result = pattern.structure.apply(slots, {
      ontology: gravitinoOntology,
      mainEntity: "Metalake",
    });
    const tree = result.sidebar[0];
    expect(tree.type).toBe("treeNav");
    expect(tree.root).toBe("Metalake");
    expect(tree.levels.map(l => l.entity)).toEqual([
      "Metalake", "Catalog", "Schema", "Table",
    ]);
  });

  it("каждый level содержит depth + children", () => {
    const slots = { sidebar: [] };
    const result = pattern.structure.apply(slots, {
      ontology: gravitinoOntology,
      mainEntity: "Metalake",
    });
    const levels = result.sidebar[0].levels;
    expect(levels[0]).toMatchObject({
      depth: 0, entity: "Metalake", children: ["Catalog"],
    });
    expect(levels[3]).toMatchObject({
      depth: 3, entity: "Table", children: [],
    });
  });

  it("prepend'ит treeNav в sidebar перед существующими items", () => {
    const slots = { sidebar: [{ type: "card", children: [] }] };
    const result = pattern.structure.apply(slots, {
      ontology: gravitinoOntology,
      mainEntity: "Metalake",
    });
    expect(result.sidebar).toHaveLength(2);
    expect(result.sidebar[0].type).toBe("treeNav");
    expect(result.sidebar[1].type).toBe("card");
  });

  it("idempotent: existing treeNav первый — no-op", () => {
    const existing = { type: "treeNav", root: "Other" };
    const slots = { sidebar: [existing] };
    const result = pattern.structure.apply(slots, {
      ontology: gravitinoOntology,
      mainEntity: "Metalake",
    });
    expect(result.sidebar[0]).toBe(existing);
  });

  it("без иерархии → no-op", () => {
    const slots = { sidebar: [] };
    const flatOntology = {
      entities: { Item: { fields: { id: { type: "text" } } } },
    };
    const result = pattern.structure.apply(slots, {
      ontology: flatOntology,
      mainEntity: "Item",
    });
    expect(result).toBe(slots);
  });

  it("depth ограничен 5 уровнями (защита от циклов)", () => {
    // G-K-26: добавлен features.hierarchyTreeNav для opt-in apply
    const deepOntology = {
      features: { hierarchyTreeNav: true },
      entities: {
        L0: { fields: {} },
        L1: { fields: { l0Id: { type: "entityRef" } } },
        L2: { fields: { l1Id: { type: "entityRef" } } },
        L3: { fields: { l2Id: { type: "entityRef" } } },
        L4: { fields: { l3Id: { type: "entityRef" } } },
        L5: { fields: { l4Id: { type: "entityRef" } } },
        L6: { fields: { l5Id: { type: "entityRef" } } },
      },
    };
    const slots = { sidebar: [] };
    const result = pattern.structure.apply(slots, {
      ontology: deepOntology,
      mainEntity: "L0",
    });
    expect(result.sidebar[0].levels.length).toBeLessThanOrEqual(5);
  });

  it("witness: tree.source = 'derived:hierarchy-tree-nav'", () => {
    const slots = { sidebar: [] };
    const result = pattern.structure.apply(slots, {
      ontology: gravitinoOntology,
      mainEntity: "Metalake",
    });
    expect(result.sidebar[0].source).toBe("derived:hierarchy-tree-nav");
  });
});
