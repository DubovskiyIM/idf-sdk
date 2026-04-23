import { describe, it, expect } from "vitest";
import catalogDefaultDatagrid from "./catalog-default-datagrid.js";

const { deriveColumn, humanize, pluralizeLower } = catalogDefaultDatagrid._helpers;

describe("catalog-default-datagrid — trigger.match", () => {
  const baseProjection = {
    archetype: "catalog",
    mainEntity: "Metalake",
    witnesses: ["name", "comment"],
  };

  const ontologyMinimal = {
    entities: {
      Metalake: {
        fields: {
          name:    { type: "string" },
          comment: { type: "string" },
        },
      },
    },
  };

  it("matches CRUD-admin catalog без visual signals", () => {
    expect(catalogDefaultDatagrid.trigger.match([], ontologyMinimal, baseProjection)).toBe(true);
  });

  it("НЕ matches catalog с image field (yields to grid-card-layout)", () => {
    const ont = { entities: { Metalake: { fields: { name: { type: "string" }, logo: { type: "image" } } } } };
    expect(catalogDefaultDatagrid.trigger.match([], ont, baseProjection)).toBe(false);
  });

  it("НЕ matches catalog с multiImage field", () => {
    const ont = { entities: { Metalake: { fields: { name: { type: "string" }, photos: { type: "multiImage" } } } } };
    expect(catalogDefaultDatagrid.trigger.match([], ont, baseProjection)).toBe(false);
  });

  it("НЕ matches catalog с ≥3 money/percentage/trend metrics", () => {
    const ont = {
      entities: {
        Portfolio: {
          fields: {
            name: { type: "string" },
            total: { type: "number", fieldRole: "money" },
            pnl:   { type: "number", fieldRole: "money" },
            yield: { type: "number", fieldRole: "percentage" },
          },
        },
      },
    };
    const proj = { archetype: "catalog", mainEntity: "Portfolio", witnesses: ["name", "total", "pnl", "yield"] };
    expect(catalogDefaultDatagrid.trigger.match([], ont, proj)).toBe(false);
  });

  it("НЕ matches если archetype не catalog", () => {
    const proj = { ...baseProjection, archetype: "detail" };
    expect(catalogDefaultDatagrid.trigger.match([], ontologyMinimal, proj)).toBe(false);
  });

  it("НЕ matches если <2 witness-полей (osmysl tabular только от 2+)", () => {
    const proj = { ...baseProjection, witnesses: ["name"] };
    expect(catalogDefaultDatagrid.trigger.match([], ontologyMinimal, proj)).toBe(false);
  });

  it("НЕ matches если mainEntity не в ontology", () => {
    const proj = { ...baseProjection, mainEntity: "MissingEntity" };
    expect(catalogDefaultDatagrid.trigger.match([], ontologyMinimal, proj)).toBe(false);
  });
});

describe("catalog-default-datagrid — structure.apply", () => {
  const ontology = {
    entities: {
      Policy: {
        fields: {
          name:    { type: "string" },
          type:    { type: "string", values: ["masking", "retention", "access"] },
          enabled: { type: "boolean" },
          comment: { type: "string" },
        },
      },
    },
  };
  const projection = {
    archetype: "catalog",
    mainEntity: "Policy",
    name: "Policies",
    witnesses: ["name", "type", "enabled", "comment"],
  };

  it("заменяет slots.body на dataGrid с auto-derived columns", () => {
    const slots = { body: { type: "list", source: "policies", item: { type: "card" } } };
    const out = catalogDefaultDatagrid.structure.apply(slots, { projection, ontology });
    expect(out.body.type).toBe("dataGrid");
    expect(out.body.source).toBe("policies");
    expect(out.body.columns).toHaveLength(4);
    const typeCol = out.body.columns.find(c => c.key === "type");
    expect(typeCol.filter).toBe("enum");
    expect(typeCol.values).toEqual(["masking", "retention", "access"]);
    const enabledCol = out.body.columns.find(c => c.key === "enabled");
    expect(enabledCol.filter).toBe("enum");
    expect(enabledCol.values).toEqual([true, false]);
  });

  it("сохраняет body.onItemClick", () => {
    const slots = {
      body: {
        type: "list",
        onItemClick: { action: "navigate", to: "policy_detail", params: { id: "item.id" } },
      },
    };
    const out = catalogDefaultDatagrid.structure.apply(slots, { projection, ontology });
    expect(out.body.onItemClick).toEqual({ action: "navigate", to: "policy_detail", params: { id: "item.id" } });
  });

  it("no-op если body уже dataGrid (author-override)", () => {
    const slots = { body: { type: "dataGrid", items: [], columns: [{ key: "custom" }] } };
    const out = catalogDefaultDatagrid.structure.apply(slots, { projection, ontology });
    expect(out).toBe(slots);
  });

  it("no-op если body.layout === 'grid' (grid-card-layout сработал)", () => {
    const slots = { body: { type: "list", layout: "grid", cardSpec: {} } };
    const out = catalogDefaultDatagrid.structure.apply(slots, { projection, ontology });
    expect(out).toBe(slots);
  });

  it("no-op если projection.bodyOverride задан (author-override)", () => {
    const slots = { body: { type: "list" } };
    const projOv = { ...projection, bodyOverride: { type: "dataGrid" } };
    const out = catalogDefaultDatagrid.structure.apply(slots, { projection: projOv, ontology });
    expect(out).toBe(slots);
  });

  it("не включает image-type / json-type поля в columns", () => {
    const ont2 = {
      entities: {
        Report: {
          fields: {
            name:   { type: "string" },
            cover:  { type: "image" },
            payload: { type: "json" },
            status: { type: "string", values: ["draft", "ready"] },
          },
        },
      },
    };
    const proj2 = { archetype: "catalog", mainEntity: "Report", witnesses: ["name", "cover", "payload", "status"] };
    const slots = { body: { type: "list" } };
    const out = catalogDefaultDatagrid.structure.apply(slots, { projection: proj2, ontology: ont2 });
    const keys = out.body.columns.map(c => c.key);
    expect(keys).toContain("name");
    expect(keys).toContain("status");
    expect(keys).not.toContain("cover");
    expect(keys).not.toContain("payload");
  });

  it("пропускает fieldRole:'heroImage' / 'avatar'", () => {
    const ont2 = {
      entities: {
        User: {
          fields: {
            name: { type: "string" },
            avatar: { type: "string", fieldRole: "avatar" },
          },
        },
      },
    };
    const proj2 = { archetype: "catalog", mainEntity: "User", witnesses: ["name", "avatar"] };
    const slots = { body: { type: "list" } };
    const out = catalogDefaultDatagrid.structure.apply(slots, { projection: proj2, ontology: ont2 });
    const keys = out.body.columns.map(c => c.key);
    expect(keys).toEqual(["name"]);
  });
});

describe("catalog-default-datagrid — helpers", () => {
  it("humanize camelCase → humanized", () => {
    expect(humanize("storageLocation")).toBe("Storage Location");
    expect(humanize("name")).toBe("Name");
  });

  it("pluralizeLower — обычные слова + y/s/x endings", () => {
    expect(pluralizeLower("Metalake")).toBe("metalakes");
    expect(pluralizeLower("Policy")).toBe("policies");
    expect(pluralizeLower("User")).toBe("users");
    expect(pluralizeLower("Schema")).toBe("schemas");
  });

  it("deriveColumn string → sortable+filterable", () => {
    const col = deriveColumn("name", { fields: { name: { type: "string" } } });
    expect(col).toEqual({ key: "name", label: "Name", sortable: true, filterable: true });
  });

  it("deriveColumn boolean → sortable+enum filter [true,false]", () => {
    const col = deriveColumn("enabled", { fields: { enabled: { type: "boolean" } } });
    expect(col.filter).toBe("enum");
    expect(col.values).toEqual([true, false]);
  });

  it("deriveColumn string с field.values → enum filter", () => {
    const col = deriveColumn("status", { fields: { status: { type: "string", values: ["a", "b"] } } });
    expect(col.filter).toBe("enum");
    expect(col.values).toEqual(["a", "b"]);
  });

  it("deriveColumn image → null (skip)", () => {
    expect(deriveColumn("cover", { fields: { cover: { type: "image" } } })).toBe(null);
  });

  it("deriveColumn number → sortable без filterable", () => {
    const col = deriveColumn("age", { fields: { age: { type: "number" } } });
    expect(col.sortable).toBe(true);
    expect(col.filterable).toBeUndefined();
    expect(col.filter).toBeUndefined();
  });
});
