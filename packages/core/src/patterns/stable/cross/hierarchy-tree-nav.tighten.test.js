// G-K-26 (Keycloak dogfood post-final, 2026-04-24): hierarchy-tree-nav
// pattern был промоушен слишком aggressive — match'ился на любой
// FK-chain ≥3 уровней (e-commerce Category→Product→LineItem,
// Realm→Client→ClientScope, etc), и apply ВСЕГДА инжектил treeNav в
// slots.sidebar без author-signal.
//
// Tighten:
//   (b) trigger.match — требует self-reference (parentId на entity)
//       ИЛИ explicit `entity.hierarchy: true` declaration
//   (c) structure.apply — opt-in via projection.patterns.enabled или
//       ontology.features.hierarchyTreeNav (без opt-in — match но
//       не apply)
import { describe, it, expect } from "vitest";
import hierarchyTreeNav from "./hierarchy-tree-nav.js";

const trigger = hierarchyTreeNav.trigger.match;
const apply = hierarchyTreeNav.structure.apply;

describe("G-K-26: hierarchy-tree-nav trigger ужесточён (self-ref ИЛИ explicit)", () => {
  it("e-commerce Category→Product→LineItem без self-ref — НЕ матчится (был aggressive)", () => {
    const ontology = {
      entities: {
        Category: { fields: {} },
        Product: { fields: { categoryId: { type: "text" } } },
        LineItem: { fields: { productId: { type: "text" } } },
      },
    };
    expect(trigger([], ontology, { mainEntity: "Category" })).toBe(false);
  });

  it("Realm→Client→ClientScope без self-ref — НЕ матчится (Keycloak case)", () => {
    const ontology = {
      entities: {
        Realm: { fields: {} },
        Client: { fields: { realmId: { type: "text" } } },
        ClientScope: { fields: { clientId: { type: "text" } } },
      },
    };
    expect(trigger([], ontology, { mainEntity: "Realm" })).toBe(false);
  });

  it("Group с parentId references Group (self-ref) — МАТЧИТСЯ", () => {
    const ontology = {
      entities: {
        Group: { fields: { parentId: { type: "text", references: "Group" } } },
      },
    };
    expect(trigger([], ontology, { mainEntity: "Group" })).toBe(true);
  });

  it("entity.hierarchy:true explicit declaration — МАТЧИТСЯ", () => {
    const ontology = {
      entities: {
        Folder: { hierarchy: true, fields: { name: { type: "text" } } },
      },
    };
    expect(trigger([], ontology, { mainEntity: "Folder" })).toBe(true);
  });

  it("Cat без self-ref + без hierarchy:true + дети есть — НЕ матчится", () => {
    const ontology = {
      entities: {
        Cat: { fields: {} },
        Kitten: { fields: { catId: { type: "text" } } },
      },
    };
    expect(trigger([], ontology, { mainEntity: "Cat" })).toBe(false);
  });
});

describe("G-K-26: hierarchy-tree-nav apply opt-in (не auto-inject в sidebar)", () => {
  const slotsBase = () => ({ header: [], toolbar: [], hero: [], body: {}, context: [], fab: [], overlay: [], sidebar: [] });
  const folderOntology = {
    entities: {
      Folder: { hierarchy: true, fields: { name: { type: "text" } } },
    },
  };
  const ctxBase = (extras = {}) => ({
    mainEntity: "Folder",
    ontology: folderOntology,
    projection: { mainEntity: "Folder" },
    ...extras,
  });

  it("default (без opt-in signal) — apply NO-op (sidebar не инжектится)", () => {
    const result = apply(slotsBase(), ctxBase());
    expect(result.sidebar).toEqual([]);
  });

  it("ontology.features.hierarchyTreeNav:true — apply инжектит treeNav в sidebar", () => {
    const ctx = ctxBase({
      ontology: { ...folderOntology, features: { hierarchyTreeNav: true } },
    });
    const result = apply(slotsBase(), ctx);
    expect(result.sidebar.length).toBeGreaterThanOrEqual(1);
    expect(result.sidebar[0].type).toBe("treeNav");
  });

  it("projection.patterns.enabled включает 'hierarchy-tree-nav' — apply инжектит", () => {
    const ctx = ctxBase({
      projection: { mainEntity: "Folder", patterns: { enabled: ["hierarchy-tree-nav"] } },
    });
    const result = apply(slotsBase(), ctx);
    expect(result.sidebar.length).toBeGreaterThanOrEqual(1);
    expect(result.sidebar[0].type).toBe("treeNav");
  });

  it("idempotent — sidebar[0] уже treeNav → no-op (даже с opt-in)", () => {
    const slots = slotsBase();
    slots.sidebar = [{ type: "treeNav", root: "X" }];
    const ctx = ctxBase({
      ontology: { ...folderOntology, features: { hierarchyTreeNav: true } },
    });
    const result = apply(slots, ctx);
    expect(result.sidebar.length).toBe(1);
  });
});
