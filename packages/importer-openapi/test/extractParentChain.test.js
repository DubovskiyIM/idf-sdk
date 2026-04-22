import { describe, it, expect } from "vitest";
import {
  extractCollectionChain,
  extractParentChain,
  synthesizeFkField,
} from "../src/extractParentChain.js";

describe("extractCollectionChain", () => {
  it("плоский /tasks → одна коллекция без parent-param", () => {
    const chain = extractCollectionChain("/tasks");
    expect(chain).toEqual([{ entity: "Task", param: null }]);
  });

  it("nested /tasks/{id} → entity + param", () => {
    const chain = extractCollectionChain("/tasks/{id}");
    expect(chain).toEqual([{ entity: "Task", param: "id" }]);
  });

  it("Gravitino 4-level /metalakes/{m}/catalogs/{c}/schemas/{s}/tables", () => {
    const chain = extractCollectionChain(
      "/metalakes/{metalake}/catalogs/{catalog}/schemas/{schema}/tables"
    );
    expect(chain).toEqual([
      { entity: "Metalake", param: "metalake" },
      { entity: "Catalog", param: "catalog" },
      { entity: "Schema", param: "schema" },
      { entity: "Table", param: null },
    ]);
  });

  it("skip /api/v1 prefix", () => {
    const chain = extractCollectionChain("/api/v1/metalakes/{m}/catalogs");
    expect(chain).toEqual([
      { entity: "Metalake", param: "m" },
      { entity: "Catalog", param: null },
    ]);
  });

  it("kebab-case → PascalSingular", () => {
    const chain = extractCollectionChain("/order-items/{id}/line-items");
    expect(chain).toEqual([
      { entity: "OrderItem", param: "id" },
      { entity: "LineItem", param: null },
    ]);
  });
});

describe("extractParentChain", () => {
  it("плоский path → parent null", () => {
    expect(extractParentChain("/tasks")).toEqual({
      entity: "Task",
      parent: null,
    });
  });

  it("/tasks/{id} — нет nesting, parent null", () => {
    // Единственная коллекция, {id} — её собственный идентификатор.
    expect(extractParentChain("/tasks/{id}")).toEqual({
      entity: "Task",
      parent: null,
    });
  });

  it("Gravitino /metalakes/{m}/catalogs → Catalog с parent Metalake", () => {
    expect(extractParentChain("/metalakes/{metalake}/catalogs")).toEqual({
      entity: "Catalog",
      parent: { entity: "Metalake", param: "metalake" },
    });
  });

  it("deep /metalakes/{m}/catalogs/{c}/schemas → Schema с immediate parent Catalog", () => {
    expect(
      extractParentChain("/metalakes/{m}/catalogs/{c}/schemas")
    ).toEqual({
      entity: "Schema",
      parent: { entity: "Catalog", param: "c" },
    });
  });

  it("empty path → { entity: null, parent: null }", () => {
    expect(extractParentChain("/")).toEqual({ entity: null, parent: null });
  });
});

describe("synthesizeFkField", () => {
  it("добавляет metalakeId с foreignKey metadata", () => {
    const entity = { name: "Catalog", fields: { name: { type: "string" } } };
    const parent = { entity: "Metalake", param: "metalake" };
    const added = synthesizeFkField(entity, parent);
    expect(added).toBe(true);
    expect(entity.fields.metalakeId).toEqual({
      type: "string",
      kind: "foreignKey",
      references: "Metalake",
      synthetic: "openapi-path",
    });
    expect(entity.fields.name).toEqual({ type: "string" }); // не тронут
  });

  it("идемпотентно: повторный вызов не меняет", () => {
    const entity = {
      name: "Catalog",
      fields: { metalakeId: { type: "number" } },
    };
    const added = synthesizeFkField(entity, {
      entity: "Metalake",
      param: "m",
    });
    expect(added).toBe(false);
    expect(entity.fields.metalakeId).toEqual({ type: "number" }); // сохранён existing
  });

  it("создаёт entity.fields если отсутствует", () => {
    const entity = { name: "Catalog" };
    synthesizeFkField(entity, { entity: "Metalake", param: null });
    expect(entity.fields).toBeDefined();
    expect(entity.fields.metalakeId.kind).toBe("foreignKey");
  });

  it("multi-word parent → camelCase field", () => {
    const entity = { name: "Step", fields: {} };
    synthesizeFkField(entity, { entity: "OrderItem", param: "id" });
    expect(entity.fields.orderItemId).toBeDefined();
    expect(entity.fields.orderItemId.references).toBe("OrderItem");
  });

  it("no-op на invalid args", () => {
    expect(synthesizeFkField(null, {})).toBe(false);
    expect(synthesizeFkField({ fields: {} }, null)).toBe(false);
    expect(synthesizeFkField({ fields: {} }, { entity: "" })).toBe(false);
  });
});
