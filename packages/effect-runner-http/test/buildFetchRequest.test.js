import { describe, it, expect } from "vitest";
import { buildFetchRequest } from "../src/buildFetchRequest.js";

describe("buildFetchRequest", () => {
  it("POST /tasks с body-параметрами (без :id placeholders)", () => {
    const req = buildFetchRequest({
      apiUrl: "http://api.example.com",
      endpoint: { method: "POST", path: "/tasks" },
      params: { title: "Foo", status: "todo" },
    });
    expect(req.url).toBe("http://api.example.com/tasks");
    expect(req.init.method).toBe("POST");
    expect(req.init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(req.init.body)).toEqual({ title: "Foo", status: "todo" });
  });

  it(":id в path подставляется из params.id и убирается из body", () => {
    const req = buildFetchRequest({
      apiUrl: "http://api.example.com",
      endpoint: { method: "PATCH", path: "/tasks/:id" },
      params: { id: "abc-123", status: "done" },
    });
    expect(req.url).toBe("http://api.example.com/tasks/abc-123");
    expect(JSON.parse(req.init.body)).toEqual({ status: "done" });
  });

  it("DELETE /tasks/:id → не имеет body", () => {
    const req = buildFetchRequest({
      apiUrl: "http://api.example.com",
      endpoint: { method: "DELETE", path: "/tasks/:id" },
      params: { id: "abc" },
    });
    expect(req.url).toBe("http://api.example.com/tasks/abc");
    expect(req.init.method).toBe("DELETE");
    expect(req.init.body).toBeUndefined();
  });

  it("GET /tasks → все params идут в query-string", () => {
    const req = buildFetchRequest({
      apiUrl: "http://api.example.com",
      endpoint: { method: "GET", path: "/tasks" },
      params: { limit: 10, status: "todo" },
    });
    expect(req.url).toContain("http://api.example.com/tasks?");
    const qs = new URL(req.url).searchParams;
    expect(qs.get("limit")).toBe("10");
    expect(qs.get("status")).toBe("todo");
    expect(req.init.body).toBeUndefined();
  });

  it("GET /tasks/:id — id в path, body нет, остальные params в query", () => {
    const req = buildFetchRequest({
      apiUrl: "http://api.example.com",
      endpoint: { method: "GET", path: "/tasks/:id" },
      params: { id: "abc", include: "user" },
    });
    expect(req.url).toContain("/tasks/abc?");
    expect(new URL(req.url).searchParams.get("include")).toBe("user");
  });

  it("Authorization header добавляется если передан authToken", () => {
    const req = buildFetchRequest({
      apiUrl: "http://api.example.com",
      endpoint: { method: "POST", path: "/tasks" },
      params: { title: "x" },
      authToken: "Bearer xyz",
    });
    expect(req.init.headers.Authorization).toBe("Bearer xyz");
  });

  it("apiUrl с trailing slash нормализуется", () => {
    const req = buildFetchRequest({
      apiUrl: "http://api.example.com/",
      endpoint: { method: "POST", path: "/tasks" },
      params: {},
    });
    expect(req.url).toBe("http://api.example.com/tasks");
  });
});
