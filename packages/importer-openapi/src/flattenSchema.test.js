import { describe, it, expect } from "vitest";
import { flattenSchema } from "./flattenSchema.js";

describe("flattenSchema — raw schemas (backward compat)", () => {
  it("plain object schema → возвращает как есть", () => {
    const s = { type: "object", properties: { name: { type: "string" } } };
    expect(flattenSchema(s, { components: { schemas: {} } })).toEqual(s);
  });

  it("null/undefined → возвращает as-is", () => {
    expect(flattenSchema(null, {})).toBe(null);
    expect(flattenSchema(undefined, {})).toBe(undefined);
  });
});

describe("flattenSchema — $ref resolution", () => {
  const spec = {
    components: {
      schemas: {
        Base: {
          type: "object",
          properties: { id: { type: "string" } },
        },
      },
    },
  };

  it("$ref → резолвит target schema", () => {
    const result = flattenSchema({ $ref: "#/components/schemas/Base" }, spec);
    expect(result.properties.id).toBeDefined();
  });

  it("circular $ref → возвращает null (no infinite loop)", () => {
    const cyclic = {
      components: {
        schemas: {
          A: { $ref: "#/components/schemas/A" },
        },
      },
    };
    expect(flattenSchema(cyclic.components.schemas.A, cyclic)).toBe(null);
  });
});

describe("flattenSchema — allOf", () => {
  const spec = {
    components: {
      schemas: {
        PolicyBase: {
          type: "object",
          properties: {
            name: { type: "string" },
            comment: { type: "string" },
            enabled: { type: "boolean" },
          },
          required: ["name"],
        },
        CustomPolicy: {
          allOf: [
            { $ref: "#/components/schemas/PolicyBase" },
            {
              type: "object",
              required: ["content"],
              properties: {
                content: { type: "object" },
              },
            },
          ],
        },
      },
    },
  };

  it("allOf объединяет properties из всех ветвей", () => {
    const flat = flattenSchema(spec.components.schemas.CustomPolicy, spec);
    expect(flat.type).toBe("object");
    expect(Object.keys(flat.properties).sort()).toEqual(["comment", "content", "enabled", "name"]);
  });

  it("allOf сохраняет required-fields", () => {
    const flat = flattenSchema(spec.components.schemas.CustomPolicy, spec);
    expect(flat.required).toContain("name");
    expect(flat.required).toContain("content");
  });

  it("allOf с inline schema branches без $ref", () => {
    const s = {
      allOf: [
        { type: "object", properties: { a: { type: "string" } } },
        { type: "object", properties: { b: { type: "number" } } },
      ],
    };
    const flat = flattenSchema(s, {});
    expect(flat.properties).toEqual({
      a: { type: "string" },
      b: { type: "number" },
    });
  });

  it("nested allOf — рекурсивно flatten", () => {
    const nested = {
      components: {
        schemas: {
          Inner: {
            type: "object",
            properties: { x: { type: "string" } },
          },
          Outer: {
            allOf: [{ $ref: "#/components/schemas/Inner" }, { type: "object", properties: { y: { type: "number" } } }],
          },
          Top: {
            allOf: [{ $ref: "#/components/schemas/Outer" }, { type: "object", properties: { z: { type: "boolean" } } }],
          },
        },
      },
    };
    const flat = flattenSchema(nested.components.schemas.Top, nested);
    expect(Object.keys(flat.properties).sort()).toEqual(["x", "y", "z"]);
  });
});

describe("flattenSchema — oneOf / anyOf", () => {
  it("oneOf single element → unwrap", () => {
    const spec = {
      components: {
        schemas: {
          CustomPolicy: {
            type: "object",
            properties: { name: { type: "string" }, content: { type: "object" } },
          },
          Policy: {
            oneOf: [{ $ref: "#/components/schemas/CustomPolicy" }],
            discriminator: { propertyName: "policyType", mapping: { custom: "#/components/schemas/CustomPolicy" } },
          },
        },
      },
    };
    const flat = flattenSchema(spec.components.schemas.Policy, spec);
    expect(flat.properties.name).toBeDefined();
    expect(flat.properties.content).toBeDefined();
  });

  it("oneOf multiple → union properties (over-approximation)", () => {
    const s = {
      oneOf: [
        { type: "object", properties: { a: { type: "string" }, shared: { type: "string" } } },
        { type: "object", properties: { b: { type: "number" }, shared: { type: "number" } } },
      ],
    };
    const flat = flattenSchema(s, {});
    const keys = Object.keys(flat.properties).sort();
    expect(keys).toEqual(["a", "b", "shared"]);
    // First-wins для collision
    expect(flat.properties.shared.type).toBe("string");
  });

  it("oneOf multiple с discriminator → добавляет discriminator property с enum", () => {
    const s = {
      oneOf: [
        { type: "object", properties: { a: { type: "string" } } },
        { type: "object", properties: { b: { type: "number" } } },
      ],
      discriminator: { propertyName: "kind", mapping: { x: "#/A", y: "#/B" } },
    };
    const flat = flattenSchema(s, {});
    expect(flat.properties.kind).toEqual({ type: "string", enum: ["x", "y"] });
  });

  it("anyOf — та же стратегия что oneOf", () => {
    const s = {
      anyOf: [
        { type: "object", properties: { a: { type: "string" } } },
        { type: "object", properties: { b: { type: "number" } } },
      ],
    };
    const flat = flattenSchema(s, {});
    expect(Object.keys(flat.properties).sort()).toEqual(["a", "b"]);
  });
});

describe("flattenSchema — Gravitino G32 realistic case", () => {
  const spec = {
    components: {
      schemas: {
        Audit: {
          type: "object",
          properties: {
            creator: { type: "string" },
            createTime: { type: "string", format: "date-time" },
          },
        },
        PolicyBase: {
          type: "object",
          properties: {
            name: { type: "string" },
            comment: { type: "string" },
            policyType: { type: "string" },
            enabled: { type: "boolean" },
            audit: { $ref: "#/components/schemas/Audit" },
            inherited: { type: "boolean" },
          },
        },
        PolicyContentBase: {
          type: "object",
          properties: {
            supportedObjectTypes: { type: "array", items: { type: "string" } },
          },
        },
        CustomPolicyContent: {
          allOf: [
            { $ref: "#/components/schemas/PolicyContentBase" },
            {
              type: "object",
              properties: {
                customRules: { type: "object" },
              },
            },
          ],
        },
        CustomPolicy: {
          allOf: [
            { $ref: "#/components/schemas/PolicyBase" },
            {
              type: "object",
              required: ["content"],
              properties: {
                content: { $ref: "#/components/schemas/CustomPolicyContent" },
              },
            },
          ],
        },
        Policy: {
          type: "object",
          oneOf: [{ $ref: "#/components/schemas/CustomPolicy" }],
          discriminator: {
            propertyName: "policyType",
            mapping: { custom: "#/components/schemas/CustomPolicy" },
          },
        },
      },
    },
  };

  it("Policy.oneOf[CustomPolicy.allOf[PolicyBase, content]] → flat fields", () => {
    const flat = flattenSchema(spec.components.schemas.Policy, spec);
    const keys = Object.keys(flat.properties).sort();
    expect(keys).toEqual([
      "audit",
      "comment",
      "content",
      "enabled",
      "inherited",
      "name",
      "policyType",
    ]);
  });

  it("Policy.content — оставлен как $ref-property (shallow flatten)", () => {
    // flattenSchema flatten'ит top-level composition, но не nested
    // property schemas (это было бы over-engineering для entity
    // generation; schemaToEntity использует top-level type+format).
    // Для G32 достаточно, что content поле есть на Policy entity.
    const flat = flattenSchema(spec.components.schemas.Policy, spec);
    expect(flat.properties.content).toBeDefined();
  });
});
