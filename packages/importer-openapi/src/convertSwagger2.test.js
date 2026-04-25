import { describe, it, expect } from "vitest";
import { convertSwagger2, isSwagger2 } from "./convertSwagger2.js";
import { importSpec, importOpenApi } from "./index.js";

const MIN_SWAGGER2 = {
  swagger: "2.0",
  info: { title: "Test API", version: "1.0" },
  paths: {
    "/users": {
      get: {
        operationId: "listUsers",
        responses: { 200: { description: "ok" } },
      },
    },
  },
  definitions: {
    User: {
      type: "object",
      properties: {
        id: { type: "string" },
        username: { type: "string" },
      },
    },
  },
};

describe("isSwagger2", () => {
  it("распознаёт swagger:'2.0'", () => {
    expect(isSwagger2({ swagger: "2.0" })).toBe(true);
  });
  it("openapi:3.0 — false", () => {
    expect(isSwagger2({ openapi: "3.0.0" })).toBe(false);
  });
  it("null/undefined/non-object — false", () => {
    expect(isSwagger2(null)).toBe(false);
    expect(isSwagger2(undefined)).toBe(false);
    expect(isSwagger2("text")).toBe(false);
    expect(isSwagger2({})).toBe(false);
  });
});

describe("convertSwagger2", () => {
  it("min Swagger 2.0 → OpenAPI 3.x с components.schemas", async () => {
    const result = await convertSwagger2(MIN_SWAGGER2);
    expect(result.openapi).toMatch(/^3\./);
    expect(result.components?.schemas?.User).toBeDefined();
    expect(result.components.schemas.User.type).toBe("object");
    expect(result.components.schemas.User.properties.id.type).toBe("string");
  });

  it("paths сохраняются с тем же operationId", async () => {
    const result = await convertSwagger2(MIN_SWAGGER2);
    expect(result.paths["/users"]?.get?.operationId).toBe("listUsers");
  });

  it("non-object spec → throw", async () => {
    await expect(convertSwagger2(null)).rejects.toThrow(/parsed object/);
    await expect(convertSwagger2("text")).rejects.toThrow(/parsed object/);
  });

  it("OpenAPI 3 spec → throw (не свой случай)", async () => {
    await expect(
      convertSwagger2({ openapi: "3.0.0", info: {}, paths: {} })
    ).rejects.toThrow(/swagger:"2.0"/);
  });
});

describe("importSpec — async wrapper", () => {
  it("Swagger 2.0 spec → ontology с User entity", async () => {
    const ontology = await importSpec(MIN_SWAGGER2);
    expect(ontology.entities.User).toBeDefined();
    expect(ontology.entities.User.fields.id).toBeDefined();
    expect(ontology.entities.User.fields.username).toBeDefined();
    expect(ontology.intents.listUsers).toBeDefined();
  });

  it("string source (JSON) → parsed → converted → imported", async () => {
    const json = JSON.stringify(MIN_SWAGGER2);
    const ontology = await importSpec(json);
    expect(ontology.entities.User).toBeDefined();
  });

  it("OpenAPI 3 spec — пропускает конверсию, идёт напрямую в importOpenApi", async () => {
    const oapi3 = {
      openapi: "3.0.0",
      info: { title: "x", version: "1" },
      paths: {
        "/things": {
          get: { operationId: "listThings", responses: { 200: { description: "ok" } } },
        },
      },
      components: {
        schemas: {
          Thing: { type: "object", properties: { id: { type: "string" } } },
        },
      },
    };
    const ontology = await importSpec(oapi3);
    expect(ontology.entities.Thing).toBeDefined();
    expect(ontology.intents.listThings).toBeDefined();
  });

  it("опции пробрасываются в importOpenApi (markEmbedded=false back-compat)", async () => {
    const ontology = await importSpec(MIN_SWAGGER2, { markEmbedded: false });
    // С markEmbedded:false orphan'ы не помечаются. User здесь target
    // (через listUsers), так что в любом случае не embedded — слабый тест,
    // но проверяет что опции вообще доходят (нет краша).
    expect(ontology.entities.User?.kind).toBe("internal");
  });

  it("swagger2openapi options пробрасываются (smoke: patch:false)", async () => {
    const ontology = await importSpec(MIN_SWAGGER2, {
      swagger2openapi: { patch: false, warnOnly: true },
    });
    expect(ontology.entities.User).toBeDefined();
  });
});

describe("importOpenApi guard for swagger 2.0", () => {
  it("кидает понятную ошибку с подсказкой про importSpec/convertSwagger2", () => {
    expect(() => importOpenApi(MIN_SWAGGER2)).toThrow(/Swagger 2\.0/);
    expect(() => importOpenApi(MIN_SWAGGER2)).toThrow(/importSpec|convertSwagger2/);
  });
});
