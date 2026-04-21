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
});
