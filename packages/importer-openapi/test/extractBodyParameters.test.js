import { describe, it, expect } from "vitest";
import { extractBodyParameters, importOpenApi } from "../src/index.js";

describe("extractBodyParameters (unit)", () => {
  it("inline schema: properties попадают в parameters с required + bodyParam marker", () => {
    const op = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string", description: "Tag name" },
                comment: { type: "string" },
              },
            },
          },
        },
      },
    };
    const params = extractBodyParameters(op, {});
    expect(params.name).toEqual({
      type: "string",
      bodyParam: true,
      required: true,
      description: "Tag name",
    });
    expect(params.comment).toEqual({ type: "string", bodyParam: true });
  });

  it("$ref резолвится через flattenSchema", () => {
    const spec = {
      components: {
        schemas: {
          TagCreateRequest: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string" },
              properties: { type: "object" },
            },
          },
        },
      },
    };
    const op = {
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/TagCreateRequest" },
          },
        },
      },
    };
    const params = extractBodyParameters(op, spec);
    expect(params.name?.required).toBe(true);
    expect(params.properties?.type).toBe("json");
  });

  it("allOf композиция flatten'ится в union properties", () => {
    const spec = {
      components: {
        schemas: {
          BaseTag: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
          TagExt: {
            type: "object",
            properties: { comment: { type: "string" } },
          },
        },
      },
    };
    const op = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              allOf: [
                { $ref: "#/components/schemas/BaseTag" },
                { $ref: "#/components/schemas/TagExt" },
              ],
            },
          },
        },
      },
    };
    const params = extractBodyParameters(op, spec);
    expect(params.name?.required).toBe(true);
    expect(params.comment).toBeDefined();
  });

  it("server-set fields excluded (audit / id / createTime / lastModifier / lastModifiedTime)", () => {
    const op = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                audit: { type: "object" },
                createTime: { type: "string" },
                lastModifier: { type: "string" },
                lastModifiedTime: { type: "string" },
              },
            },
          },
        },
      },
    };
    const params = extractBodyParameters(op, {});
    expect(params.id).toBeUndefined();
    expect(params.audit).toBeUndefined();
    expect(params.createTime).toBeUndefined();
    expect(params.lastModifier).toBeUndefined();
    expect(params.lastModifiedTime).toBeUndefined();
    expect(params.name).toBeDefined();
  });

  it("readOnly fields excluded", () => {
    const op = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                slug: { type: "string", readOnly: true },
                name: { type: "string" },
              },
            },
          },
        },
      },
    };
    const params = extractBodyParameters(op, {});
    expect(params.slug).toBeUndefined();
    expect(params.name).toBeDefined();
  });

  it("enum / default / description preserved", () => {
    const op = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["owner", "viewer"], default: "viewer", description: "Access role" },
              },
            },
          },
        },
      },
    };
    const params = extractBodyParameters(op, {});
    expect(params.role).toEqual({
      type: "string",
      bodyParam: true,
      description: "Access role",
      values: ["owner", "viewer"],
      default: "viewer",
    });
  });

  it("type mapping: integer → number, format date-time → datetime, array/object → json", () => {
    const op = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                count: { type: "integer" },
                when: { type: "string", format: "date-time" },
                tags: { type: "array", items: { type: "string" } },
                meta: { type: "object" },
                flag: { type: "boolean" },
              },
            },
          },
        },
      },
    };
    const params = extractBodyParameters(op, {});
    expect(params.count.type).toBe("number");
    expect(params.when.type).toBe("datetime");
    expect(params.tags.type).toBe("json");
    expect(params.meta.type).toBe("json");
    expect(params.flag.type).toBe("boolean");
  });

  it("operation без requestBody → пустой объект", () => {
    expect(extractBodyParameters({}, {})).toEqual({});
    expect(extractBodyParameters({ requestBody: {} }, {})).toEqual({});
    expect(extractBodyParameters({ requestBody: { content: {} } }, {})).toEqual({});
  });

  it("non-application/json body skipped (multipart / urlencoded — future work)", () => {
    const op = {
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: { type: "object", properties: { file: { type: "string" } } },
          },
        },
      },
    };
    expect(extractBodyParameters(op, {})).toEqual({});
  });
});

describe("importOpenApi: body params integration", () => {
  function tagSpec() {
    return {
      openapi: "3.0.0",
      info: { title: "Gravitino-like", version: "1.0" },
      paths: {
        "/metalakes/{metalake}/tags": {
          post: {
            operationId: "createTag",
            parameters: [
              { name: "metalake", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TagCreateRequest" },
                },
              },
            },
            responses: { 201: { description: "created" } },
          },
        },
        "/metalakes/{metalake}/tags/{tag}": {
          put: {
            operationId: "updateTag",
            parameters: [
              { name: "metalake", in: "path", required: true, schema: { type: "string" } },
              { name: "tag", in: "path", required: true, schema: { type: "string" } },
            ],
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TagUpdateRequest" },
                },
              },
            },
            responses: { 200: { description: "ok" } },
          },
          get: {
            operationId: "readTag",
            parameters: [
              { name: "metalake", in: "path", required: true, schema: { type: "string" } },
              { name: "tag", in: "path", required: true, schema: { type: "string" } },
            ],
            responses: { 200: { description: "ok" } },
          },
        },
      },
      components: {
        schemas: {
          Tag: {
            type: "object",
            properties: {
              name: { type: "string" },
              comment: { type: "string" },
              audit: { type: "object" },
            },
          },
          TagCreateRequest: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string", description: "Tag name" },
              comment: { type: "string" },
              properties: { type: "object" },
            },
          },
          TagUpdateRequest: {
            type: "object",
            properties: {
              comment: { type: "string" },
              properties: { type: "object" },
            },
          },
        },
      },
    };
  }

  it("POST /tags → createTag.parameters содержит и path (metalake) и body (name/comment/properties)", () => {
    const ontology = importOpenApi(tagSpec());
    const create = ontology.intents.createTag;
    expect(create).toBeDefined();
    expect(create.parameters.metalake).toBeDefined();
    expect(create.parameters.metalake.required).toBe(true);
    // metalake — path, не body
    expect(create.parameters.metalake.bodyParam).toBeUndefined();
    // body fields
    expect(create.parameters.name).toBeDefined();
    expect(create.parameters.name.required).toBe(true);
    expect(create.parameters.name.bodyParam).toBe(true);
    expect(create.parameters.comment).toBeDefined();
    expect(create.parameters.comment.bodyParam).toBe(true);
    expect(create.parameters.properties).toBeDefined();
    expect(create.parameters.properties.bodyParam).toBe(true);
  });

  it("PUT operations также extract body fields", () => {
    const ontology = importOpenApi(tagSpec());
    const update = ontology.intents.updateTag;
    expect(update).toBeDefined();
    expect(update.parameters.metalake?.required).toBe(true);
    expect(update.parameters.tag?.required).toBe(true);
    expect(update.parameters.comment?.bodyParam).toBe(true);
    expect(update.parameters.properties?.bodyParam).toBe(true);
  });

  it("GET operations не extract body params (нет requestBody)", () => {
    const ontology = importOpenApi(tagSpec());
    const read = ontology.intents.readTag;
    expect(read).toBeDefined();
    // Только path params
    expect(read.parameters.metalake).toBeDefined();
    expect(read.parameters.tag).toBeDefined();
    expect(read.parameters.name).toBeUndefined();
    expect(read.parameters.comment).toBeUndefined();
  });

  it("path/body collision: path wins (path identifies entity)", () => {
    const spec = {
      paths: {
        "/items/{name}": {
          put: {
            operationId: "updateItem",
            parameters: [{ name: "name", in: "path", required: true, schema: { type: "string" } }],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "should not override path" },
                      comment: { type: "string" },
                    },
                  },
                },
              },
            },
            responses: { 200: { description: "ok" } },
          },
        },
      },
      components: { schemas: {} },
    };
    const ontology = importOpenApi(spec);
    const update = ontology.intents.updateItem;
    // path wins — name это path param, без bodyParam
    expect(update.parameters.name.required).toBe(true);
    expect(update.parameters.name.bodyParam).toBeUndefined();
    expect(update.parameters.name.description).toBeUndefined();
    // comment чисто body
    expect(update.parameters.comment.bodyParam).toBe(true);
  });

  it("opts.extractBodyParameters=false отключает extraction (backward-compat opt-out)", () => {
    const ontology = importOpenApi(tagSpec(), { extractBodyParameters: false });
    const create = ontology.intents.createTag;
    expect(create.parameters.metalake).toBeDefined();
    // body fields НЕ извлечены
    expect(create.parameters.name).toBeUndefined();
    expect(create.parameters.comment).toBeUndefined();
  });
});
