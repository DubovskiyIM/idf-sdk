import { describe, it, expect } from "vitest";
import { propertyToField, schemaToEntity } from "./schemaToEntity.js";

describe("schemaToEntity — $ref type preservation (10.6)", () => {
  it("$ref без spec → type:json (10.6 — даже unresolved $ref не string)", () => {
    // Legacy поведение давало "string" для unresolved $ref. Фикс всегда
    // возвращает "json" для $ref, потому что $ref семантически всегда
    // ссылается на другую schema, не на primitive string.
    const field = propertyToField("spec", { $ref: "#/components/schemas/Foo" });
    expect(field.type).toBe("json");
  });

  it("с spec: $ref на object-schema → type:json (10.6 fix)", () => {
    const spec = {
      components: {
        schemas: {
          NestedObj: {
            type: "object",
            properties: {
              inner: { type: "string" },
            },
          },
        },
      },
    };
    const field = propertyToField("metadata",
      { $ref: "#/components/schemas/NestedObj" }, { spec });
    expect(field.type).toBe("json");
  });

  it("array of $ref → type:json + itemsType:object", () => {
    const spec = {
      components: {
        schemas: {
          Item: { type: "object", properties: { x: { type: "string" } } },
        },
      },
    };
    const field = propertyToField("items",
      { type: "array", items: { $ref: "#/components/schemas/Item" } },
      { spec });
    expect(field.type).toBe("json");
    expect(field.itemsType).toBe("object");
  });

  it("$ref → string-type schema → тип string (не json)", () => {
    const spec = {
      components: {
        schemas: { MyStr: { type: "string", format: "uuid" } },
      },
    };
    const field = propertyToField("id",
      { $ref: "#/components/schemas/MyStr" }, { spec });
    expect(field.type).toBe("string");
    expect(field.readOnly).toBe(true); // name === "id" → readOnly
  });

  it("schemaToEntity обрабатывает nested $ref properties (K8s pattern)", () => {
    // K8s-style: Application { metadata: $ref ObjectMeta, spec: $ref Spec }
    const spec = {
      components: {
        schemas: {
          "v1.ObjectMeta": {
            type: "object",
            properties: {
              name: { type: "string" },
              namespace: { type: "string" },
            },
          },
          "v1alpha1.ApplicationSpec": {
            type: "object",
            properties: {
              source: { type: "string" },
              destination: { type: "string" },
            },
          },
          "v1alpha1.Application": {
            type: "object",
            properties: {
              metadata: { $ref: "#/components/schemas/v1.ObjectMeta" },
              spec:     { $ref: "#/components/schemas/v1alpha1.ApplicationSpec" },
              status:   { type: "string" },  // control — должен остаться string
            },
          },
        },
      },
    };
    const appSchema = spec.components.schemas["v1alpha1.Application"];
    const entity = schemaToEntity("v1alpha1.Application", appSchema, { spec });
    expect(entity.fields.metadata.type).toBe("json"); // 10.6 fix
    expect(entity.fields.spec.type).toBe("json");     // 10.6 fix
    expect(entity.fields.status.type).toBe("string"); // control
  });

  it("allOf composition → flattened → type:json", () => {
    const spec = {
      components: {
        schemas: {
          Base:   { type: "object", properties: { x: { type: "string" } } },
          Child:  { allOf: [
            { $ref: "#/components/schemas/Base" },
            { type: "object", properties: { y: { type: "number" } } },
          ]},
        },
      },
    };
    const field = propertyToField("sub",
      { $ref: "#/components/schemas/Child" }, { spec });
    expect(field.type).toBe("json");
  });

  it("cycle-ref → graceful fallback на json (не string, не throw)", () => {
    const spec = {
      components: {
        schemas: {
          A: { type: "object", properties: { self: { $ref: "#/components/schemas/A" } } },
        },
      },
    };
    const field = propertyToField("self",
      { $ref: "#/components/schemas/A" }, { spec });
    // flattenSchema cycle-guard прерывает → fallback → json
    expect(field.type).toBe("json");
  });

  it("backward-compat: propertyToField без opts работает как раньше", () => {
    // Существующие callers без spec не должны сломаться.
    const field = propertyToField("name", { type: "string" });
    expect(field.type).toBe("string");
    const numField = propertyToField("age", { type: "integer" });
    expect(numField.type).toBe("number");
  });
});
