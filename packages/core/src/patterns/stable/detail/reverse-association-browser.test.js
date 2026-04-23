import { describe, it, expect } from "vitest";
import pattern from "./reverse-association-browser.js";

function mkAssetOntology() {
  return {
    entities: {
      Asset: {
        kind: "reference",
        fields: { id: { type: "text" }, ticker: { type: "text" } },
      },
      Position: {
        ownerField: "userId",
        fields: {
          id: { type: "text" },
          userId: { type: "entityRef" },
          assetId: { type: "entityRef" },
          quantity: { type: "number" },
        },
      },
    },
  };
}

function mkPolymorphicTagOntology() {
  return {
    entities: {
      Tag: {
        kind: "reference",
        fields: { id: { type: "text" }, name: { type: "text" } },
      },
      TagAssociation: {
        kind: "assignment",
        fields: {
          id: { type: "text" },
          tagId: { type: "entityRef" },
          objectId: { type: "entityRef" },
          objectType: { type: "select", options: ["Catalog", "Schema", "Table"] },
        },
      },
    },
  };
}

describe("reverse-association-browser trigger.match", () => {
  it("срабатывает на reference-entity с FK-referrer'ами", () => {
    const ok = pattern.trigger.match([], mkAssetOntology(), { mainEntity: "Asset" });
    expect(ok).toBe(true);
  });

  it("срабатывает на polymorphic junction с objectType", () => {
    const ok = pattern.trigger.match([], mkPolymorphicTagOntology(), { mainEntity: "Tag" });
    expect(ok).toBe(true);
  });

  it("не срабатывает на non-reference entity", () => {
    const ontology = {
      entities: {
        Portfolio: { fields: { id: { type: "text" } } },
        Position: {
          fields: { id: { type: "text" }, portfolioId: { type: "entityRef" } },
        },
      },
    };
    const ok = pattern.trigger.match([], ontology, { mainEntity: "Portfolio" });
    expect(ok).toBe(false);
  });

  it("не срабатывает если у reference нет referrer'ов", () => {
    const ontology = {
      entities: {
        Asset: { kind: "reference", fields: { id: { type: "text" } } },
      },
    };
    const ok = pattern.trigger.match([], ontology, { mainEntity: "Asset" });
    expect(ok).toBe(false);
  });
});

describe("reverse-association-browser.structure.apply", () => {
  it("добавляет секцию reverseM2mBrowse для Asset→Position", () => {
    const result = pattern.structure.apply({}, {
      ontology: mkAssetOntology(),
      mainEntity: "Asset",
      projection: {},
    });
    expect(result.sections).toHaveLength(1);
    const section = result.sections[0];
    expect(section.id).toBe("reverse_ref_position");
    expect(section.kind).toBe("reverseM2mBrowse");
    expect(section.entity).toBe("Position");
    expect(section.foreignKey).toBe("assetId");
    expect(section.groupBy).toBeNull();
    expect(section.readOnly).toBe(true);
    expect(section.source).toBe("derived:reverse-association-browser");
  });

  it("polymorphic junction с objectType → groupBy заполнен", () => {
    const result = pattern.structure.apply({}, {
      ontology: mkPolymorphicTagOntology(),
      mainEntity: "Tag",
      projection: {},
    });
    expect(result.sections).toHaveLength(1);
    const section = result.sections[0];
    expect(section.entity).toBe("TagAssociation");
    expect(section.foreignKey).toBe("tagId");
    expect(section.groupBy).toBe("objectType");
    expect(section.readOnly).toBe(false); // assignment-kind → writable
  });

  it("idempotent: existing section с тем же id не перезаписывается", () => {
    const slots = {
      sections: [{ id: "reverse_ref_position", custom: true }],
    };
    const result = pattern.structure.apply(slots, {
      ontology: mkAssetOntology(),
      mainEntity: "Asset",
      projection: {},
    });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].custom).toBe(true);
  });

  it("author subCollections → apply skip'ает (author wins)", () => {
    const slots = { sections: [] };
    const result = pattern.structure.apply(slots, {
      ontology: mkAssetOntology(),
      mainEntity: "Asset",
      projection: { subCollections: [{ entity: "Custom" }] },
    });
    expect(result).toBe(slots);
  });

  it("mainEntity не reference → no-op", () => {
    const ontology = {
      entities: {
        Portfolio: { fields: { id: { type: "text" } } },
        Position: { fields: { id: { type: "text" }, portfolioId: { type: "entityRef" } } },
      },
    };
    const slots = {};
    const result = pattern.structure.apply(slots, {
      ontology,
      mainEntity: "Portfolio",
      projection: {},
    });
    expect(result).toBe(slots);
  });

  it("reference-to-reference пропускается (FK на reference от reference не учитывается)", () => {
    const ontology = {
      entities: {
        Category: { kind: "reference", fields: { id: { type: "text" } } },
        Tag: {
          kind: "reference",
          fields: { id: { type: "text" }, categoryId: { type: "entityRef" } },
        },
      },
    };
    const result = pattern.structure.apply({}, {
      ontology,
      mainEntity: "Category",
      projection: {},
    });
    // Tag — reference, поэтому не попадает в reverse-браузер
    expect(result.sections).toBeUndefined();
  });
});
