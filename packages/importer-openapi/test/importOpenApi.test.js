import { describe, it, expect } from "vitest";
import { importOpenApi } from "../src/index.js";

describe("importOpenApi", () => {
  it("минимальный CRUD spec → ontology с entity + 5 intents", () => {
    const spec = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0" },
      paths: {
        "/tasks": {
          get: { operationId: "listTask", responses: { 200: { description: "ok" } } },
          post: {
            operationId: "createTask",
            requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
            responses: { 201: { description: "created" } },
          },
        },
        "/tasks/{id}": {
          get: { operationId: "readTask", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "ok" } } },
          patch: { operationId: "updateTask", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "ok" } } },
          delete: { operationId: "removeTask", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 204: { description: "gone" } } },
        },
      },
      components: {
        schemas: {
          Task: {
            type: "object",
            properties: {
              id: { type: "string", readOnly: true },
              title: { type: "string" },
              status: { type: "string", default: "todo" },
              created_at: { type: "string", format: "date-time" },
            },
          },
        },
      },
    };

    const ontology = importOpenApi(spec);

    expect(ontology.entities.Task).toBeDefined();
    expect(ontology.entities.Task.fields.title.role).toBe("primary-title");
    expect(ontology.entities.Task.fields.created_at.role).toBe("date-witness");

    expect(ontology.intents.createTask).toBeDefined();
    expect(ontology.intents.createTask.alpha).toBe("insert");
    expect(ontology.intents.readTask.endpoint.path).toBe("/tasks/:id");
    expect(ontology.intents.removeTask.alpha).toBe("remove");
    expect(ontology.intents.updateTask.alpha).toBe("replace");
    expect(ontology.intents.listTask.alpha).toBeUndefined();
  });

  it("security scheme → roles с viewer base", () => {
    const spec = {
      paths: {},
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      },
    };

    const ontology = importOpenApi(spec);
    expect(ontology.roles.owner).toEqual({ base: "owner" });
  });

  it("custom intent через operationId (POST /tasks/{id}/approve → approveTask)", () => {
    const spec = {
      paths: {
        "/tasks/{id}/approve": {
          post: {
            operationId: "approveTask",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: "ok" } },
          },
        },
      },
      components: { schemas: {} },
    };

    const ontology = importOpenApi(spec);
    expect(ontology.intents.approveTask).toBeDefined();
    expect(ontology.intents.approveTask.endpoint.path).toBe("/tasks/:id/approve");
  });

  it("path-derived FK: nested /metalakes/{m}/catalogs → Catalog.metalakeId → Metalake", () => {
    const spec = {
      paths: {
        "/metalakes/{metalake}/catalogs": {
          get: {
            operationId: "listCatalogs",
            parameters: [{ name: "metalake", in: "path", required: true, schema: { type: "string" } }],
            responses: { 200: { description: "ok" } },
          },
        },
      },
      components: {
        schemas: {
          Metalake: { type: "object", properties: { name: { type: "string" } } },
          Catalog: { type: "object", properties: { name: { type: "string" } } },
        },
      },
    };

    const ontology = importOpenApi(spec);
    expect(ontology.entities.Catalog.fields.metalakeId).toEqual({
      type: "string",
      kind: "foreignKey",
      references: "Metalake",
      synthetic: "openapi-path",
    });
  });

  it("path-derived FK: deep /metalakes/{m}/catalogs/{c}/schemas → Schema.catalogId (immediate parent)", () => {
    const spec = {
      paths: {
        "/metalakes/{m}/catalogs/{c}/schemas": {
          post: {
            operationId: "createSchema",
            responses: { 201: { description: "ok" } },
            requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Schema" } } } },
          },
        },
      },
      components: {
        schemas: {
          Metalake: { type: "object", properties: { name: { type: "string" } } },
          Catalog: { type: "object", properties: { name: { type: "string" } } },
          Schema: { type: "object", properties: { name: { type: "string" } } },
        },
      },
    };

    const ontology = importOpenApi(spec);
    // Immediate parent — Catalog (не Metalake, хотя оба в пути)
    expect(ontology.entities.Schema.fields.catalogId).toBeDefined();
    expect(ontology.entities.Schema.fields.catalogId.references).toBe("Catalog");
    // Metalake не становится прямым FK на Schema — иерархия через Catalog
    expect(ontology.entities.Schema.fields.metalakeId).toBeUndefined();
  });

  it("path-derived FK идемпотентен: existing field не перезаписывается synthetic-маркером", () => {
    const spec = {
      paths: {
        "/metalakes/{m}/catalogs": {
          get: { operationId: "listCatalogs", responses: { 200: { description: "ok" } } },
        },
      },
      components: {
        schemas: {
          Metalake: { type: "object", properties: { name: { type: "string" } } },
          Catalog: {
            type: "object",
            properties: {
              name: { type: "string" },
              // author уже объявил metalakeId — не должен получить synthetic-маркер
              metalakeId: { type: "integer", default: 0 },
            },
          },
        },
      },
    };

    const ontology = importOpenApi(spec);
    const fk = ontology.entities.Catalog.fields.metalakeId;
    expect(fk).toBeDefined();
    expect(fk.synthetic).toBeUndefined(); // не synthetic — от автора
    expect(fk.type).toBe("number"); // preserved из author-schema (integer→number)
    expect(fk.default).toBe(0); // preserved default
    expect(fk.references).toBeUndefined(); // не добавлено поверх author-поля
  });

  it("flat path без nesting не синтезирует FK", () => {
    const spec = {
      paths: {
        "/tasks": {
          get: { operationId: "listTask", responses: { 200: { description: "ok" } } },
        },
      },
      components: {
        schemas: {
          Task: { type: "object", properties: { id: { type: "string" } } },
        },
      },
    };

    const ontology = importOpenApi(spec);
    // Никаких synthetic FK
    const fks = Object.values(ontology.entities.Task.fields).filter(
      (f) => f && f.synthetic === "openapi-path"
    );
    expect(fks.length).toBe(0);
  });
});
