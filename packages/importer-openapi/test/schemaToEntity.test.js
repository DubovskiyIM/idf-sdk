import { describe, it, expect } from "vitest";
import { schemaToEntity, propertyToField } from "../src/schemaToEntity.js";

describe("propertyToField", () => {
  it("OpenAPI string → {type:string}", () => {
    expect(propertyToField("title", { type: "string" }).type).toBe("string");
  });

  it("integer → {type:number}", () => {
    expect(propertyToField("age", { type: "integer" }).type).toBe("number");
  });

  it("number → {type:number}", () => {
    expect(propertyToField("price", { type: "number" }).type).toBe("number");
  });

  it("boolean → {type:boolean}", () => {
    expect(propertyToField("active", { type: "boolean" }).type).toBe("boolean");
  });

  it("date-time format → {type:datetime}", () => {
    const f = propertyToField("created_at", { type: "string", format: "date-time" });
    expect(f.type).toBe("datetime");
    expect(f.role).toBe("date-witness");
  });

  it("title/name → role: primary-title", () => {
    expect(propertyToField("title", { type: "string" }).role).toBe("primary-title");
    expect(propertyToField("name", { type: "string" }).role).toBe("primary-title");
  });

  it("email → role: contact", () => {
    expect(propertyToField("email", { type: "string" }).role).toBe("contact");
  });

  it("price + numeric → role: money", () => {
    const f = propertyToField("price", { type: "number" });
    expect(f.role).toBe("money");
  });

  it("readOnly из schema", () => {
    const f = propertyToField("id", { type: "string", readOnly: true });
    expect(f.readOnly).toBe(true);
  });

  it("default из schema", () => {
    const f = propertyToField("status", { type: "string", default: "todo" });
    expect(f.default).toBe("todo");
  });
});

describe("schemaToEntity", () => {
  it("properties → fields; required → нет (для MVP)", () => {
    const entity = schemaToEntity("Task", {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        title: { type: "string" },
        status: { type: "string", default: "todo" },
      },
      required: ["title"],
    });

    expect(entity.name).toBe("Task");
    expect(entity.kind).toBe("internal");
    expect(entity.fields.id.readOnly).toBe(true);
    expect(entity.fields.title.role).toBe("primary-title");
    expect(entity.fields.status.default).toBe("todo");
  });

  it("ownerField определяется если есть userId/ownerId", () => {
    const entity = schemaToEntity("Order", {
      type: "object",
      properties: {
        id: { type: "string", readOnly: true },
        userId: { type: "string" },
        total: { type: "number" },
      },
    });
    expect(entity.ownerField).toBe("userId");
  });

  it("не-object schema игнорируется (вернёт null)", () => {
    expect(schemaToEntity("Primitive", { type: "string" })).toBeNull();
  });
});
