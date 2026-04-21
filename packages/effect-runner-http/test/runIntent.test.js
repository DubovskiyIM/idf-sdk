import { describe, it, expect, vi, beforeEach } from "vitest";
import { runIntent } from "../src/runIntent.js";

function mockResponse({ ok = true, status = 200, json = {} } = {}) {
  return {
    ok,
    status,
    async json() { return json; },
    async text() { return JSON.stringify(json); },
  };
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

const entity = { name: "Task" };
const createIntent = {
  target: "Task",
  alpha: "insert",
  parameters: {
    title: { type: "string", required: true },
    status: { type: "string" },
  },
};

describe("runIntent", () => {
  it("happy path: POST → success → resolves с server response", async () => {
    globalThis.fetch.mockResolvedValue(
      mockResponse({ json: { id: "new-1", title: "Foo", status: "todo" } })
    );

    const result = await runIntent({
      name: "createTask",
      intent: createIntent,
      entity,
      params: { title: "Foo", status: "todo" },
      apiUrl: "http://api",
    });

    expect(result.ok).toBe(true);
    expect(result.data.id).toBe("new-1");
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("http://api/tasks");
    expect(init.method).toBe("POST");
  });

  it("HTTP 4xx → result.ok=false + error сообщение", async () => {
    globalThis.fetch.mockResolvedValue(
      mockResponse({ ok: false, status: 400, json: { error: "validation failed" } })
    );

    const result = await runIntent({
      name: "createTask",
      intent: createIntent,
      entity,
      params: { title: "Foo" },
      apiUrl: "http://api",
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe("validation failed");
  });

  it("network error → result.ok=false + error.message", async () => {
    globalThis.fetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await runIntent({
      name: "createTask",
      intent: createIntent,
      entity,
      params: { title: "Foo" },
      apiUrl: "http://api",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ECONNREFUSED/);
  });

  it("auth token через getAuthToken → Authorization header", async () => {
    globalThis.fetch.mockResolvedValue(mockResponse());

    await runIntent({
      name: "createTask",
      intent: createIntent,
      entity,
      params: { title: "Foo" },
      apiUrl: "http://api",
      getAuthToken: () => "Bearer abc",
    });

    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer abc");
  });

  it("async getAuthToken (promise) resolves перед fetch", async () => {
    globalThis.fetch.mockResolvedValue(mockResponse());

    await runIntent({
      name: "createTask",
      intent: createIntent,
      entity,
      params: { title: "Foo" },
      apiUrl: "http://api",
      getAuthToken: async () => "Bearer async",
    });

    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer async");
  });
});
