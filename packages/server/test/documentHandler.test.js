import { describe, it, expect, vi } from "vitest";
import { createDocumentHandler } from "../src/index.js";

function fakeReq({ method = "POST", slug = [], body = {} } = {}) {
  return { method, query: { slug }, body };
}

function fakeRes() {
  const res = {
    _status: 200,
    _json: null,
    status(s) { res._status = s; return res; },
    json(j) { res._json = j; return res; },
    setHeader() { return res; },
    end() { return res; },
  };
  return res;
}

const ontology = {
  name: "test",
  entities: {
    Task: {
      name: "Task",
      kind: "internal",
      fields: {
        id: { type: "string", readOnly: true },
        title: { type: "string", role: "primary-title" },
        status: { type: "string" },
      },
    },
  },
  intents: {
    createTask: { creates: "Task", particles: { confirmation: "enter", effects: [{ target: "Task" }] } },
    listTask: { particles: {} },
  },
  projections: {
    Task_catalog: {
      kind: "catalog",
      mainEntity: "Task",
      witnesses: ["title", "status"],
    },
  },
  roles: { owner: { base: "owner" } },
};

describe("createDocumentHandler", () => {
  it("POST → 200 с document-graph для существующей projection", async () => {
    const handler = createDocumentHandler({ ontology });
    const req = fakeReq({
      method: "POST",
      slug: ["Task_catalog"],
      body: { world: { tasks: [{ id: "1", title: "Foo", status: "todo" }] }, viewer: { id: "u1" } },
    });
    const res = fakeRes();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toBeDefined();
    expect(res._json.sections).toBeDefined(); // document-graph формат
  });

  it("GET → 405 Method Not Allowed", async () => {
    const handler = createDocumentHandler({ ontology });
    const req = fakeReq({ method: "GET" });
    const res = fakeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it("slug без projection → 400 Bad Request", async () => {
    const handler = createDocumentHandler({ ontology });
    const req = fakeReq({ method: "POST", slug: [] });
    const res = fakeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("unknown projection → 404", async () => {
    const handler = createDocumentHandler({ ontology });
    const req = fakeReq({
      method: "POST",
      slug: ["does_not_exist"],
      body: { world: {} },
    });
    const res = fakeRes();
    await handler(req, res);
    expect(res._status).toBe(404);
  });

  it("slug — строка (вместо массива) тоже работает", async () => {
    const handler = createDocumentHandler({ ontology });
    const req = {
      method: "POST",
      query: { slug: "Task_catalog" },
      body: { world: { tasks: [] } },
    };
    const res = fakeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });
});
