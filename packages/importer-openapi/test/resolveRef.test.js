import { describe, it, expect } from "vitest";
import { resolveRef } from "../src/resolveRef.js";

describe("resolveRef", () => {
  const spec = {
    components: {
      schemas: {
        User: { type: "object", properties: { id: { type: "string" } } },
        Task: {
          type: "object",
          properties: { user: { $ref: "#/components/schemas/User" } },
        },
      },
    },
  };

  it("возвращает schema as-is если нет $ref", () => {
    const s = { type: "string" };
    expect(resolveRef(s, spec)).toEqual({ type: "string" });
  });

  it("резолвит $ref по JSON pointer", () => {
    const s = { $ref: "#/components/schemas/User" };
    expect(resolveRef(s, spec)).toEqual({
      type: "object",
      properties: { id: { type: "string" } },
    });
  });

  it("возвращает undefined для несуществующего ref", () => {
    const s = { $ref: "#/components/schemas/Missing" };
    expect(resolveRef(s, spec)).toBeUndefined();
  });

  it("поддерживает вложенный JSON pointer", () => {
    const s = { $ref: "#/components/schemas/User/properties/id" };
    expect(resolveRef(s, spec)).toEqual({ type: "string" });
  });

  it("циклические refs (защита от бесконечности)", () => {
    const cyclic = {
      components: {
        schemas: {
          A: { $ref: "#/components/schemas/B" },
          B: { $ref: "#/components/schemas/A" },
        },
      },
    };
    expect(() => resolveRef({ $ref: "#/components/schemas/A" }, cyclic)).toThrow(/cycle/i);
  });
});
