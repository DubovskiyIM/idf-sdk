import { describe, it, expect } from "vitest";
import { createVoiceHandler } from "../src/index.js";

function fakeReq({ method = "POST", slug = [], body = {}, format } = {}) {
  return {
    method,
    query: { slug, ...(format ? { format } : {}) },
    body,
  };
}

function fakeRes() {
  let ended = null;
  const res = {
    _status: 200, _json: null, _body: null, _headers: {},
    status(s) { res._status = s; return res; },
    json(j) { res._json = j; return res; },
    setHeader(k, v) { res._headers[k] = v; return res; },
    end(b) { res._body = b; ended = true; return res; },
  };
  return res;
}

const ontology = {
  name: "test",
  entities: {
    Task: {
      name: "Task", kind: "internal",
      fields: {
        id: { type: "string", readOnly: true },
        title: { type: "string", role: "primary-title" },
      },
    },
  },
  intents: {
    createTask: { creates: "Task", particles: { confirmation: "enter", effects: [{ target: "Task" }] } },
    listTask: { particles: {} },
  },
  projections: {
    Task_catalog: { kind: "catalog", mainEntity: "Task", witnesses: ["title"] },
  },
  roles: { owner: { base: "owner" } },
};

describe("createVoiceHandler", () => {
  it("POST без format → 200 JSON с turns", async () => {
    const handler = createVoiceHandler({ ontology });
    const req = fakeReq({ slug: ["Task_catalog"], body: { world: { tasks: [{ id: "1", title: "Foo" }] } } });
    const res = fakeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json).toBeDefined();
    expect(res._json.turns).toBeDefined();
  });

  it("format=ssml → Content-Type ssml+xml", async () => {
    const handler = createVoiceHandler({ ontology });
    const req = fakeReq({ slug: ["Task_catalog"], format: "ssml", body: { world: { tasks: [] } } });
    const res = fakeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._headers["Content-Type"]).toContain("ssml+xml");
    expect(typeof res._body).toBe("string");
  });

  it("format=plain → Content-Type text/plain", async () => {
    const handler = createVoiceHandler({ ontology });
    const req = fakeReq({ slug: ["Task_catalog"], format: "plain", body: { world: { tasks: [] } } });
    const res = fakeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._headers["Content-Type"]).toContain("text/plain");
  });

  it("GET → 405", async () => {
    const handler = createVoiceHandler({ ontology });
    const req = fakeReq({ method: "GET" });
    const res = fakeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it("unknown projection → 404", async () => {
    const handler = createVoiceHandler({ ontology });
    const req = fakeReq({ slug: ["missing"], body: { world: {} } });
    const res = fakeRes();
    await handler(req, res);
    expect(res._status).toBe(404);
  });
});
