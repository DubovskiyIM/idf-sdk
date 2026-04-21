import { describe, it, expect } from "vitest";
import { modelFieldToField } from "../src/modelFieldToField.js";

const field = (props) => ({
  name: "x",
  fieldType: "String",
  array: false,
  optional: false,
  attributes: [],
  ...props,
});

describe("modelFieldToField", () => {
  it("String → type:string", () => {
    expect(modelFieldToField(field({ fieldType: "String" })).type).toBe("string");
  });

  it("Int / BigInt → type:number", () => {
    expect(modelFieldToField(field({ fieldType: "Int" })).type).toBe("number");
    expect(modelFieldToField(field({ fieldType: "BigInt" })).type).toBe("number");
  });

  it("Float / Decimal → type:number", () => {
    expect(modelFieldToField(field({ fieldType: "Float" })).type).toBe("number");
    expect(modelFieldToField(field({ fieldType: "Decimal" })).type).toBe("number");
  });

  it("Boolean → type:boolean", () => {
    expect(modelFieldToField(field({ fieldType: "Boolean" })).type).toBe("boolean");
  });

  it("DateTime → type:datetime", () => {
    expect(modelFieldToField(field({ fieldType: "DateTime" })).type).toBe("datetime");
  });

  it("Json → type:json", () => {
    expect(modelFieldToField(field({ fieldType: "Json" })).type).toBe("json");
  });

  it("@id → readOnly", () => {
    const f = field({
      name: "id",
      attributes: [{ type: "attribute", name: "id" }],
    });
    expect(modelFieldToField(f).readOnly).toBe(true);
  });

  it("@updatedAt → readOnly + role:date-witness", () => {
    const f = field({
      name: "updatedAt",
      fieldType: "DateTime",
      attributes: [{ type: "attribute", name: "updatedAt" }],
    });
    const out = modelFieldToField(f);
    expect(out.readOnly).toBe(true);
    expect(out.role).toBe("date-witness");
  });

  it("role inference: title/name → primary-title", () => {
    expect(modelFieldToField(field({ name: "title" })).role).toBe("primary-title");
    expect(modelFieldToField(field({ name: "name" })).role).toBe("primary-title");
  });

  it("role: email → contact", () => {
    expect(modelFieldToField(field({ name: "email" })).role).toBe("contact");
  });

  it("role: price + numeric → money", () => {
    expect(modelFieldToField(field({ name: "price", fieldType: "Decimal" })).role).toBe("money");
  });

  it("@default с literal → default", () => {
    const f = field({
      name: "status",
      attributes: [
        {
          type: "attribute",
          name: "default",
          args: [{ type: "attributeArgument", value: '"todo"' }],
        },
      ],
    });
    expect(modelFieldToField(f).default).toBe("todo");
  });

  it("@default с function → игнорируется", () => {
    const f = field({
      name: "id",
      attributes: [
        {
          type: "attribute",
          name: "default",
          args: [{ type: "attributeArgument", value: { type: "function", name: "cuid" } }],
        },
      ],
    });
    expect(modelFieldToField(f).default).toBeUndefined();
  });

  it("relation-поле (fieldType = UpperCase модель) → возвращает null", () => {
    // Когда fieldType это другая модель, это relation-пир, не поле.
    // Indicator: array OR optional без дополнительной нативной type-поддержки.
    const f = field({ name: "author", fieldType: "User", optional: true });
    expect(modelFieldToField(f, new Set(["User"]))).toBeNull();
  });

  it("array = true → игнорируется (relation-list)", () => {
    const f = field({ name: "posts", fieldType: "Post", array: true });
    expect(modelFieldToField(f, new Set(["Post"]))).toBeNull();
  });
});
