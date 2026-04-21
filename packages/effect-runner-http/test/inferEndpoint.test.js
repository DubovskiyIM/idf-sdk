import { describe, it, expect } from "vitest";
import { inferEndpoint, tableNameFor } from "../src/inferEndpoint.js";

describe("inferEndpoint", () => {
  it("createX (alpha:insert) → POST /tasks", () => {
    const ep = inferEndpoint({
      name: "createTask",
      intent: { target: "Task", alpha: "insert" },
      entity: { name: "Task" },
    });
    expect(ep).toEqual({ method: "POST", path: "/tasks" });
  });

  it("updateX (alpha:replace) → PATCH /tasks/:id", () => {
    const ep = inferEndpoint({
      name: "updateTask",
      intent: { target: "Task", alpha: "replace" },
      entity: { name: "Task" },
    });
    expect(ep).toEqual({ method: "PATCH", path: "/tasks/:id" });
  });

  it("removeX (alpha:remove) → DELETE /tasks/:id", () => {
    const ep = inferEndpoint({
      name: "removeTask",
      intent: { target: "Task", alpha: "remove" },
      entity: { name: "Task" },
    });
    expect(ep).toEqual({ method: "DELETE", path: "/tasks/:id" });
  });

  it("listX (query) → GET /tasks", () => {
    const ep = inferEndpoint({
      name: "listTask",
      intent: { target: "Task" },
      entity: { name: "Task" },
    });
    expect(ep).toEqual({ method: "GET", path: "/tasks" });
  });

  it("readX (query с id) → GET /tasks/:id", () => {
    const ep = inferEndpoint({
      name: "readTask",
      intent: { target: "Task", parameters: { id: { type: "string", required: true } } },
      entity: { name: "Task" },
    });
    expect(ep).toEqual({ method: "GET", path: "/tasks/:id" });
  });

  it("explicit intent.endpoint override побеждает inference", () => {
    const ep = inferEndpoint({
      name: "approveOrder",
      intent: {
        target: "Order",
        alpha: "replace",
        endpoint: { method: "POST", path: "/orders/:id/approve" },
      },
      entity: { name: "Order" },
    });
    expect(ep).toEqual({ method: "POST", path: "/orders/:id/approve" });
  });
});

describe("tableNameFor", () => {
  it("Task → tasks", () => expect(tableNameFor("Task")).toBe("tasks"));
  it("OrderItem → order_items", () => expect(tableNameFor("OrderItem")).toBe("order_items"));
  it("Category → categories", () => expect(tableNameFor("Category")).toBe("categories"));
  it("Order → orders", () => expect(tableNameFor("Order")).toBe("orders"));
});
