import { describe, it, expect } from "vitest";
import { createAgentHandler } from "../src/index.js";

function fakeReq({ method = "GET", slug = [] } = {}) {
  return { method, query: { slug } };
}

function fakeRes() {
  const res = {
    _status: 200, _json: null,
    status(s) { res._status = s; return res; },
    json(j) { res._json = j; return res; },
    setHeader() { return res; },
    end() { return res; },
  };
  return res;
}

const ontology = {
  name: "test",
  entities: { Task: { name: "Task", fields: { id: { type: "string" } } } },
  intents: {
    createTask: { target: "Task", alpha: "insert" },
    listTask: { target: "Task" },
  },
  roles: { owner: { base: "owner" } },
};

describe("createAgentHandler", () => {
  it("GET /schema → domain/entities/intents/roles", async () => {
    const handler = createAgentHandler({ ontology });
    const req = fakeReq({ slug: ["schema"] });
    const res = fakeRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.domain).toBe("test");
    expect(res._json.entities).toContain("Task");
    expect(res._json.intents.find((i) => i.name === "createTask").alpha).toBe("insert");
    expect(res._json.roles).toContain("owner");
  });

  it("GET без slug → тот же schema output (default)", async () => {
    const handler = createAgentHandler({ ontology });
    const req = fakeReq({ slug: [] });
    const res = fakeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._json.entities).toBeDefined();
  });

  it("GET /exec → 501 Not Implemented", async () => {
    const handler = createAgentHandler({ ontology });
    const req = fakeReq({ slug: ["exec"] });
    const res = fakeRes();
    await handler(req, res);
    expect(res._status).toBe(501);
  });

  it("POST → 405 Method Not Allowed", async () => {
    const handler = createAgentHandler({ ontology });
    const req = fakeReq({ method: "POST", slug: ["schema"] });
    const res = fakeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });
});
