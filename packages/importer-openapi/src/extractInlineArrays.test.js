import { describe, it, expect } from "vitest";
import { extractInlineArrays } from "./extractInlineArrays.js";
import { importOpenApi } from "./index.js";

describe("extractInlineArrays", () => {
  it("K8s-like status.resources[] → parent.inlineCollections", () => {
    const spec = {
      components: {
        schemas: {
          Application: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              status: {
                type: "object",
                properties: {
                  resources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        kind: { type: "string" },
                        name: { type: "string" },
                        health: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const entities = {
      Application: { name: "Application", kind: "internal", fields: {} },
    };
    const result = extractInlineArrays(entities, spec);
    expect(result.Application.inlineCollections).toBeDefined();
    expect(result.Application.inlineCollections).toHaveLength(1);
    const ic = result.Application.inlineCollections[0];
    expect(ic.fieldName).toBe("resources");
    expect(ic.path).toEqual(["status", "resources"]);
    expect(Object.keys(ic.itemFields)).toEqual(["kind", "name", "health"]);
  });

  it("два inline arrays (resources + conditions) — оба вытаскиваются", () => {
    const spec = {
      components: {
        schemas: {
          Application: {
            type: "object",
            properties: {
              status: {
                type: "object",
                properties: {
                  resources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { kind: { type: "string" }, health: { type: "string" } },
                    },
                  },
                  conditions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        status: { type: "string" },
                        lastTransitionTime: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const entities = {
      Application: { name: "Application", kind: "internal", fields: {} },
    };
    const result = extractInlineArrays(entities, spec);
    const names = result.Application.inlineCollections.map((c) => c.fieldName);
    expect(names).toEqual(["resources", "conditions"]);
    expect(result.Application.inlineCollections[1].path).toEqual(["status", "conditions"]);
  });

  it("items.$ref → извлекается itemName", () => {
    const spec = {
      components: {
        schemas: {
          Application: {
            type: "object",
            properties: {
              status: {
                type: "object",
                properties: {
                  resources: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ResourceStatus" },
                  },
                },
              },
            },
          },
          ResourceStatus: {
            type: "object",
            properties: {
              kind: { type: "string" },
              group: { type: "string" },
            },
          },
        },
      },
    };
    const entities = {
      Application: { kind: "internal", fields: {} },
    };
    const result = extractInlineArrays(entities, spec);
    expect(result.Application.inlineCollections[0].itemName).toBe("ResourceStatus");
    expect(Object.keys(result.Application.inlineCollections[0].itemFields)).toEqual([
      "kind",
      "group",
    ]);
  });

  it("array of primitive — игнорируется (только object-items)", () => {
    const spec = {
      components: {
        schemas: {
          Tag: {
            type: "object",
            properties: {
              labels: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    };
    const entities = { Tag: { kind: "internal", fields: {} } };
    const result = extractInlineArrays(entities, spec);
    expect(result.Tag.inlineCollections).toBeUndefined();
  });

  it("items с одним полем — ниже minItemFields=2, игнорируется", () => {
    const spec = {
      components: {
        schemas: {
          Foo: {
            type: "object",
            properties: {
              names: {
                type: "array",
                items: { type: "object", properties: { name: { type: "string" } } },
              },
            },
          },
        },
      },
    };
    const entities = { Foo: { kind: "internal", fields: {} } };
    const result = extractInlineArrays(entities, spec);
    expect(result.Foo.inlineCollections).toBeUndefined();
  });

  it("path-derived stub (без schema в spec) — пропускается", () => {
    const spec = { components: { schemas: {} } };
    const entities = { Stub: { kind: "internal", fields: { id: {} } } };
    const result = extractInlineArrays(entities, spec);
    expect(result.Stub.inlineCollections).toBeUndefined();
  });

  it("не мутирует вход", () => {
    const spec = {
      components: {
        schemas: {
          App: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: { a: { type: "string" }, b: { type: "string" } },
                },
              },
            },
          },
        },
      },
    };
    const entities = { App: { kind: "internal", fields: {} } };
    const beforeJson = JSON.stringify(entities);
    extractInlineArrays(entities, spec);
    expect(JSON.stringify(entities)).toBe(beforeJson);
  });

  it("top-level inline array (без status wrap) тоже вытаскивается", () => {
    const spec = {
      components: {
        schemas: {
          Order: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: { sku: { type: "string" }, qty: { type: "integer" } },
                },
              },
            },
          },
        },
      },
    };
    const entities = { Order: { kind: "internal", fields: {} } };
    const result = extractInlineArrays(entities, spec);
    expect(result.Order.inlineCollections).toHaveLength(1);
    expect(result.Order.inlineCollections[0].path).toEqual(["items"]);
  });

  it("minItemFields=1 — включает single-field objects", () => {
    const spec = {
      components: {
        schemas: {
          Foo: {
            type: "object",
            properties: {
              names: {
                type: "array",
                items: { type: "object", properties: { name: { type: "string" } } },
              },
            },
          },
        },
      },
    };
    const entities = { Foo: { kind: "internal", fields: {} } };
    const result = extractInlineArrays(entities, spec, { minItemFields: 1 });
    expect(result.Foo.inlineCollections).toHaveLength(1);
  });
});

describe("importOpenApi — extractInlineArrays integration", () => {
  it("default-on: Application получает inlineCollections из status", () => {
    const spec = {
      components: {
        schemas: {
          Application: {
            type: "object",
            properties: {
              id: { type: "string" },
              status: {
                type: "object",
                properties: {
                  conditions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      paths: {
        "/applications": {
          get: { operationId: "listApplications", responses: { 200: { description: "ok" } } },
        },
      },
    };
    const result = importOpenApi(spec);
    expect(result.entities.Application?.inlineCollections).toBeDefined();
    expect(result.entities.Application.inlineCollections[0].fieldName).toBe("conditions");
  });

  it("opts.extractInlineArrays=false — back-compat", () => {
    const spec = {
      components: {
        schemas: {
          Application: {
            type: "object",
            properties: {
              status: {
                type: "object",
                properties: {
                  conditions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      paths: {
        "/applications": {
          get: { operationId: "listApplications", responses: { 200: { description: "ok" } } },
        },
      },
    };
    const result = importOpenApi(spec, { extractInlineArrays: false });
    expect(result.entities.Application?.inlineCollections).toBeUndefined();
  });
});
