import { describe, it, expect } from "vitest";
import { buildCompositions } from "./buildCompositions.js";

describe("buildCompositions (backlog §8.7)", () => {
  it("Task.customerId → User двусторонняя: Task→customer (one), User→tasks (many)", () => {
    const entities = {
      Task: {
        name: "Task",
        fields: { id: {}, customerId: {} },
        relations: { customerId: { entity: "User", kind: "belongs-to" } },
      },
      User: { name: "User", fields: { id: {} } },
    };
    const c = buildCompositions(entities);
    expect(c.Task).toEqual([
      { entity: "User", as: "customer", via: "customerId", mode: "one" },
    ]);
    expect(c.User).toEqual([
      { entity: "Task", as: "tasks", via: "customerId", mode: "many" },
    ]);
  });

  it("multi-FK: Deal.customerId + Deal.executorId → compositions с обеих сторон", () => {
    const entities = {
      Deal: {
        name: "Deal",
        relations: {
          customerId: { entity: "User", kind: "belongs-to" },
          executorId: { entity: "User", kind: "belongs-to" },
        },
      },
      User: { name: "User" },
    };
    const c = buildCompositions(entities);
    expect(c.Deal).toHaveLength(2);
    expect(c.Deal[0].as).toBe("customer");
    expect(c.Deal[1].as).toBe("executor");
    // User получает два "many" — для каждого FK.
    expect(c.User).toHaveLength(2);
    expect(c.User[0].entity).toBe("Deal");
    expect(c.User[0].via).toBe("customerId");
    expect(c.User[1].via).toBe("executorId");
  });

  it("snake_case FK (user_id) — alias без суффикса _id", () => {
    const entities = {
      Post: {
        name: "Post",
        relations: { user_id: { entity: "User", kind: "belongs-to" } },
      },
      User: { name: "User" },
    };
    const c = buildCompositions(entities);
    expect(c.Post[0].as).toBe("user");
  });

  it("plural: Category → categories (ies-suffix)", () => {
    const entities = {
      Category: { name: "Category" },
      Task: {
        name: "Task",
        relations: { categoryId: { entity: "Category", kind: "belongs-to" } },
      },
    };
    const c = buildCompositions(entities);
    expect(c.Category[0].as).toBe("tasks");
    expect(c.Task[0].as).toBe("category");
  });

  it("relations без belongs-to — пропускаются", () => {
    const entities = {
      A: {
        name: "A",
        relations: { bId: { entity: "B", kind: "has-many" } },
      },
      B: { name: "B" },
    };
    expect(buildCompositions(entities)).toEqual({});
  });

  it("entity без relations — пропускается", () => {
    const entities = { A: { name: "A", fields: {} } };
    expect(buildCompositions(entities)).toEqual({});
  });

  it("relation.entity не в entities — пропускается", () => {
    const entities = {
      A: {
        name: "A",
        relations: { ghostId: { entity: "Ghost", kind: "belongs-to" } },
      },
    };
    expect(buildCompositions(entities)).toEqual({});
  });
});
