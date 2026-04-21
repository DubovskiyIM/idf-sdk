import { describe, it, expect, vi, beforeEach } from "vitest";
import { runIntent } from "../src/index.js";

function resp(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() { return data; },
    async text() { return JSON.stringify(data); },
  };
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

const ontology = {
  entities: {
    Task: {
      name: "Task",
      kind: "internal",
      fields: {
        id: { type: "string", readOnly: true },
        title: { type: "string", role: "primary-title" },
        status: { type: "string", default: "todo" },
      },
    },
  },
  intents: {
    createTask: {
      target: "Task",
      alpha: "insert",
      parameters: { title: { type: "string", required: true } },
    },
    updateTask: {
      target: "Task",
      alpha: "replace",
      parameters: { id: { type: "string", required: true }, status: { type: "string" } },
    },
    removeTask: {
      target: "Task",
      alpha: "remove",
      parameters: { id: { type: "string", required: true } },
    },
    listTask: {
      target: "Task",
      parameters: {},
    },
  },
};

describe("integration: full CRUD против mock fetch", () => {
  const intent = (name) => ({
    name,
    intent: ontology.intents[name],
    entity: ontology.entities[ontology.intents[name].target],
    apiUrl: "http://api.test",
  });

  it("createTask → POST /tasks с body", async () => {
    globalThis.fetch.mockResolvedValue(resp({ id: "1", title: "A", status: "todo" }));

    const result = await runIntent({
      ...intent("createTask"),
      params: { title: "A" },
    });

    expect(result.ok).toBe(true);
    expect(result.data.id).toBe("1");
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("http://api.test/tasks");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ title: "A" });
  });

  it("updateTask → PATCH /tasks/:id с id в path, остальные в body", async () => {
    globalThis.fetch.mockResolvedValue(resp({ id: "1", status: "done" }));

    await runIntent({
      ...intent("updateTask"),
      params: { id: "1", status: "done" },
    });

    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("http://api.test/tasks/1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ status: "done" });
  });

  it("removeTask → DELETE /tasks/:id без body", async () => {
    globalThis.fetch.mockResolvedValue(resp({}));

    await runIntent({
      ...intent("removeTask"),
      params: { id: "1" },
    });

    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("http://api.test/tasks/1");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("listTask → GET /tasks", async () => {
    globalThis.fetch.mockResolvedValue(
      resp([{ id: "1", title: "A" }, { id: "2", title: "B" }])
    );

    const result = await runIntent({
      ...intent("listTask"),
      params: {},
    });

    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("http://api.test/tasks");
    expect(init.method).toBe("GET");
  });

  it("validation-ошибка backend'а (400) → ok=false с сообщением", async () => {
    globalThis.fetch.mockResolvedValue(
      resp({ error: "title required" }, { ok: false, status: 400 })
    );

    const result = await runIntent({
      ...intent("createTask"),
      params: {},
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe("title required");
  });
});
